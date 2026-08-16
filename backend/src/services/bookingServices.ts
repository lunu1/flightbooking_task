import { createBookingWithPassengers, updateBookingStripeSession,updateBookingStatus, findAllBookings } from '../models/bookingModels';
import { findFlightById } from '../models/flightModels';
import { findBookingById } from '../models/bookingModels';
import stripe from '../config/stripe';
import { releaseSeatsAndFailBooking,cancelBookingAndReleaseSeats } from '../models/bookingModels';
const CANCELLATION_WINDOW_HOURS = 24;


interface PassengerInput {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
    email: string;
    contactNumber: string;
}



export const createBooking = async (
    userId: number,
    flightId: number,
    passengers: PassengerInput[]
) => {
    if (!passengers || passengers.length === 0) {
        throw new Error('At least one passenger is required');
    }

    // validate each passenger has all required fields
    for (const p of passengers) {
        if (!p.fullName || !p.dateOfBirth || !p.nationality || !p.passportNumber || !p.email || !p.contactNumber) {
            throw new Error('All passenger fields are required');
        }
    }

    const flight = await findFlightById(flightId);
    if (!flight) {
        throw new Error('Flight not found');
    }

    const passengerCount = passengers.length;
    const totalFare = parseFloat(flight.fare) * passengerCount;

    const booking = await createBookingWithPassengers(
        userId,
        flightId,
        passengerCount,
        totalFare,
        passengers
    );

    return booking;
};

export const createCheckoutSession = async (bookingId: number, userId: number) => {
    const booking = await findBookingById(bookingId);

    if (!booking) {
        throw new Error('Booking not found');
    }
    if (booking.user_id !== userId) {
        throw new Error('Not authorized for this booking');
    }
    if (booking.status !== 'pending') {
        throw new Error('Booking is not in a payable state');
    }

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'aed',
                    product_data: {
                        name: `Flight Booking #${booking.id}`,
                    },
                    unit_amount: Math.round(parseFloat(booking.total_fare) * 100),
                },
                quantity: 1,
            },
        ],
        success_url: `${process.env.FRONTEND_URL}/bookings/${booking.id}/success`,
        cancel_url: `${process.env.FRONTEND_URL}/bookings/${booking.id}/cancel`,
        metadata: {
            bookingId: booking.id.toString(),
        },
        payment_intent_data: {                      
            metadata: {                                  
                bookingId: booking.id.toString(),         
            },
        },
    });

    await updateBookingStripeSession(booking.id, session.id);

    return { url: session.url };
};

export const confirmBookingPayment = async (bookingId: number, paymentIntentId: string) => {
    await updateBookingStatus(bookingId, 'confirmed', paymentIntentId);
};

export const failBookingPayment = async (bookingId: number) => {
    await releaseSeatsAndFailBooking(bookingId);
};

export const cancelBooking = async (bookingId: number, userId: number, isAdmin: boolean) => {
    const booking = await findBookingById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }

    if (!isAdmin) {
        if (booking.user_id !== userId) {
            throw new Error('Not authorized for this booking');
        }

        const flight = await findFlightById(booking.flight_id);
        const hoursUntilDeparture = (new Date(flight.departure_date).getTime() - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilDeparture < CANCELLATION_WINDOW_HOURS) {
            throw new Error('Cancellation window has passed');
        }
    }

    // release seats + mark cancelled (DB side)
    const cancelledBooking = await cancelBookingAndReleaseSeats(bookingId);

    // issue Stripe refund
    if (cancelledBooking.stripe_payment_intent_id) {
        await stripe.refunds.create({
            payment_intent: cancelledBooking.stripe_payment_intent_id,
        });
    }

    return { message: 'Booking cancelled and refund initiated' };
};


export const getAllBookings = async (query: {
    status?: string;
    date?: string;
    origin?: string;
    destination?: string;
    page?: string;
    limit?: string;
}) => {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10)));

    const { bookings, total } = await findAllBookings ({
        status: query.status,
        date: query.date,
        origin: query.origin,
        destination: query.destination,
        page,
        limit,
    });

    return {
        bookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};