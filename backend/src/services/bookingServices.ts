import { createBookingWithPassengers, updateBookingStripeSession,updateBookingStatus } from '../models/bookingModels';
import { findFlightById } from '../models/flightModels';
import { findBookingById } from '../models/bookingModels';
import stripe from '../config/stripe';
import { releaseSeatsAndFailBooking } from '../models/bookingModels';




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