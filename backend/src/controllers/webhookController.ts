import { Request, Response } from 'express';
import stripe from '../config/stripe';
import { confirmBookingPayment, failBookingPayment } from '../services/bookingServices';

export const stripeWebhookHandler = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body, // must be raw body, not parsed JSON — see note below
            sig!,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const bookingId = parseInt(session.metadata.bookingId, 10);
        await confirmBookingPayment(bookingId, session.payment_intent);


    }


    if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const bookingId = parseInt(session.metadata.bookingId, 10);
    await confirmBookingPayment(bookingId, session.payment_intent);
}

if (event.type === 'payment_intent.payment_failed' || event.type === 'checkout.session.expired') {
    const obj = event.data.object as any;
    const bookingId = parseInt(obj.metadata.bookingId, 10);
    if (!isNaN(bookingId)) {
        await failBookingPayment(bookingId);
    }
}

    res.status(200).json({ received: true });
};