import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { createBooking } from '../services/bookingServices';
import { createCheckoutSession } from '../services/bookingServices';


export const createBookingHandler = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { flightId, passengers } = req.body;

        if (!flightId) {
            return res.status(400).json({ message: "flightId is required" });
        }

        const booking = await createBooking(userId, flightId, passengers);
        res.status(201).json(booking);
    } catch (error) {
        const message = (error as Error).message;
        console.error('Create booking error:', error);

        if (message === 'Flight not found') {
            return res.status(404).json({ message });
        }
        if (message === 'Not enough seats available' || message === 'At least one passenger is required' || message === 'All passenger fields are required') {
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

export const createCheckoutSessionHandler = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const idParam = req.params.id;

        if (!idParam || typeof idParam !== 'string') {
            return res.status(400).json({ message: "Invalid booking id" });
        }

        const bookingId = parseInt(idParam, 10);
        if (isNaN(bookingId)) {
            return res.status(400).json({ message: "Invalid booking id" });
        }

        const { url } = await createCheckoutSession(bookingId, userId);
        res.status(200).json({ url });
    } catch (error) {
        const message = (error as Error).message;
        console.error('Checkout session error:', error);

        if (message === 'Booking not found') return res.status(404).json({ message });
        if (message === 'Not authorized for this booking') return res.status(403).json({ message });
        if (message === 'Booking is not in a payable state') return res.status(400).json({ message });
        res.status(500).json({ message: "Internal server error" });
    }
};