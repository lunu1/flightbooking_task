import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { getAllBookings } from '../services/bookingServices';
import { getStats } from '../services/bookingServices';


export const getAllBookingsHandler = async (req: AuthRequest, res: Response) => {
    try {
        const result = await getAllBookings(req.query as any);
        res.status(200).json(result);
    } catch (error) {
        console.error('Get all bookings error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getDashboardStatsHandler = async (req: AuthRequest, res: Response) => {
    try {
        const stats = await getStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};