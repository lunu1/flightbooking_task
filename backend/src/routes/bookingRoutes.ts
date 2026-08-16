import { Router } from 'express';
import { cancelBookingHandler, createBookingHandler, createCheckoutSessionHandler } from '../controllers/bookingController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, createBookingHandler);
router.post('/:id/checkout', authenticate, createCheckoutSessionHandler);
router.patch('/:id/cancel', authenticate, cancelBookingHandler);

export default router;

