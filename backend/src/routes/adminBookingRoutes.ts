import { Router } from 'express';
import { getAllBookingsHandler } from '../controllers/adminBookingController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.get('/bookings', authenticate, authorize('admin'), getAllBookingsHandler);

export default router;