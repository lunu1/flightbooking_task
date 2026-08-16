import { Router } from 'express';
import { createFlightHandler, updateFlightHandler, deleteFlightHandler } from '../controllers/adminFlightController';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();

router.post('/flights', authenticate, authorize('admin'), createFlightHandler);
router.patch('/flights/:id', authenticate, authorize('admin'), updateFlightHandler);
router.delete('/flights/:id', authenticate, authorize('admin'), deleteFlightHandler);

export default router;