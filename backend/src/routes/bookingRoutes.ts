import { Router } from 'express';
import { cancelBookingHandler, createBookingHandler, createCheckoutSessionHandler, getMyBookingsHandler } from '../controllers/bookingController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, createBookingHandler);
router.post('/:id/checkout', authenticate, createCheckoutSessionHandler);
router.patch('/:id/cancel', authenticate, cancelBookingHandler);
router.get('/mine', authenticate, getMyBookingsHandler);

export default router;

