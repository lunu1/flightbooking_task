import { Router } from 'express';
import { getAllBookingsHandler, getDashboardStatsHandler } from '../controllers/adminBookingController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/bookings', authenticate, authorize('admin'), getAllBookingsHandler);
router.get('/dashboard/stats', authenticate, authorize('admin'), getDashboardStatsHandler);

export default router;