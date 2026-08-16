import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { getAllBookings } from '../services/bookingServices';

export const getAllBookingsHandler = async (req: AuthRequest, res: Response) => {
    try {
        const result = await getAllBookings(req.query as any);
        res.status(200).json(result);
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};