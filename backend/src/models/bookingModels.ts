import pool from '../config/db';
import { PoolClient } from 'pg';

export const createBookingWithPassengers = async (
    userId: number,
    flightId: number,
    passengerCount: number,
    totalFare: number,
    passengers: {
        fullName: string;
        dateOfBirth: string;
        nationality: string;
        passportNumber: string;
        email: string;
        contactNumber: string;
    }[]
) => {
    const client: PoolClient = await pool.connect();
    try {
        await client.query('BEGIN');

        // lock the flight row — any concurrent booking on this flight waits here
        const flightResult = await client.query(
            'SELECT seats_available FROM flights WHERE id = $1 FOR UPDATE',
            [flightId]
        );

        if (flightResult.rows.length === 0) {
            throw new Error('Flight not found');
        }

        const seatsAvailable = flightResult.rows[0].seats_available;
        if (seatsAvailable < passengerCount) {
            throw new Error('Not enough seats available');
        }

        // decrement seats
        await client.query(
            'UPDATE flights SET seats_available = seats_available - $1 WHERE id = $2',
            [passengerCount, flightId]
        );

        // create booking (pending)
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, flight_id, status, passenger_count, total_fare)
             VALUES ($1, $2, 'pending', $3, $4) RETURNING *`,
            [userId, flightId, passengerCount, totalFare]
        );
        const booking = bookingResult.rows[0];

        // insert passengers
        for (const p of passengers) {
            await client.query(
                `INSERT INTO passengers (booking_id, full_name, date_of_birth, nationality, passport_number, email, contact_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [booking.id, p.fullName, p.dateOfBirth, p.nationality, p.passportNumber, p.email, p.contactNumber]
            );
        }

        await client.query('COMMIT');
        return booking;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const updateBookingStripeSession = async (bookingId: number, sessionId: string) => {
    await pool.query(
        'UPDATE bookings SET stripe_session_id = $1, updated_at = NOW() WHERE id = $2',
        [sessionId, bookingId]
    );
}

export const findBookingById = async (id: number) => {
    const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    return result.rows[0] || null;
};

export const updateBookingStatus = async (
    bookingId: number,
    status: string,
    paymentIntentId?: string
) => {
    await pool.query(
        `UPDATE bookings 
         SET status = $1, stripe_payment_intent_id = $2, updated_at = NOW() 
         WHERE id = $3`,
        [status, paymentIntentId || null, bookingId]
    );
};