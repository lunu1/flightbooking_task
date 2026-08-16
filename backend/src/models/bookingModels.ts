import pool from '../config/db';
import { PoolClient } from 'pg';

interface BookingFilterParams {
    status?: string | undefined;
    date?: string | undefined;
    origin?: string | undefined;
    destination?: string | undefined;
    page: number;
    limit: number;
}

export const findAllBookings = async (params: BookingFilterParams) => {
    const { status, date, origin, destination, page, limit } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (status) {
        conditions.push(`b.status = $${idx++}`);
        values.push(status);
    }
    if (date) {
        conditions.push(`f.departure_date::date = $${idx++}`);
        values.push(date);
    }
    if (origin) {
        conditions.push(`f.origin = $${idx++}`);
        values.push(origin.toUpperCase());
    }
    if (destination) {
        conditions.push(`f.destination = $${idx++}`);
        values.push(destination.toUpperCase());
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const dataQuery = `
        SELECT b.id, b.status, b.passenger_count, b.total_fare, b.created_at,
               f.flight_number, f.origin, f.destination, f.departure_date,
               u.email as user_email
        FROM bookings b
        JOIN flights f ON b.flight_id = f.id
        JOIN users u ON b.user_id = u.id
        ${whereClause}
        ORDER BY b.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const countQuery = `
        SELECT COUNT(*) FROM bookings b JOIN flights f ON b.flight_id = f.id ${whereClause}
    `;
    const countValues = values.slice(0, values.length - 2);

    const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, values),
        pool.query(countQuery, countValues),
    ]);

    return {
        bookings: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
    };
};

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

export const releaseSeatsAndFailBooking = async (bookingId: number) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const bookingResult = await client.query(
            'SELECT flight_id, passenger_count, status FROM bookings WHERE id = $1 FOR UPDATE',
            [bookingId]
        );
        const booking = bookingResult.rows[0];

        if (!booking || booking.status !== 'pending') {
          
            await client.query('ROLLBACK');
            return;
        }

        await client.query(
            'UPDATE flights SET seats_available = seats_available + $1 WHERE id = $2',
            [booking.passenger_count, booking.flight_id]
        );

        await client.query(
            `UPDATE bookings SET status = 'failed', updated_at = NOW() WHERE id = $1`,
            [bookingId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const cancelBookingAndReleaseSeats = async (bookingId: number) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const bookingResult = await client.query(
            'SELECT * FROM bookings WHERE id = $1 FOR UPDATE',
            [bookingId]
        );
        const booking = bookingResult.rows[0];

        if (!booking) {
            throw new Error('Booking not found');
        }
        if (booking.status !== 'confirmed') {
            throw new Error('Only confirmed bookings can be cancelled');
        }

        await client.query(
            'UPDATE flights SET seats_available = seats_available + $1 WHERE id = $2',
            [booking.passenger_count, booking.flight_id]
        );

        await client.query(
            `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [bookingId]
        );

        await client.query('COMMIT');
        return booking; // return original row so caller has payment_intent_id for refund
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getDashboardStats = async () => {
    const statsQuery = `
        SELECT
            COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) AS bookings_today,
            COALESCE(SUM(total_fare) FILTER (WHERE status = 'confirmed'), 0) AS total_revenue,
            COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_count,
            COUNT(*) AS total_bookings
        FROM bookings
    `;
    const result = await pool.query(statsQuery);
    return result.rows[0];
};
