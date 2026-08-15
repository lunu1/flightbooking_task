import { Router } from 'express';
import { searchFlightsHandler, getFlightHandler } from '../controllers/flightController';

const router = Router();

router.get('/search', searchFlightsHandler);
router.get('/:id', getFlightHandler);

export default router;