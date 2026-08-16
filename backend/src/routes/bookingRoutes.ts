import { Router } from 'express';
import { createBookingHandler, createCheckoutSessionHandler } from '../controllers/bookingController';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.post('/', authenticate, createBookingHandler);
router.post('/:id/checkout', authenticate, createCheckoutSessionHandler);

export default router;

