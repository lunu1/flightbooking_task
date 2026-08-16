import { Response } from 'express';
import { AuthRequest } from '../middleware/authenticate';
import { addFlight, editFlight, removeFlight } from '../services/flightServices';

export const createFlightHandler = async (req: AuthRequest, res: Response) => {
    try {
        const flight = await addFlight(req.body);
        res.status(201).json(flight);
    } catch (error) {
        const message = (error as Error).message;
        console.error('Create flight error:', error);
        if (message.includes('is required')) return res.status(400).json({ message });
        res.status(500).json({ message: "Internal server error" });
    }
};

export const updateFlightHandler = async (req: AuthRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        if (!idParam || typeof idParam !== 'string') return res.status(400).json({ message: "Invalid flight id" });
        const id = parseInt(idParam, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid flight id" });

        const flight = await editFlight(id, req.body);
        res.status(200).json(flight);
    } catch (error) {
        const message = (error as Error).message;
        console.error('Update flight error:', error);
        if (message === 'Flight not found') return res.status(404).json({ message });
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteFlightHandler = async (req: AuthRequest, res: Response) => {
    try {
        const idParam = req.params.id;
        if (!idParam || typeof idParam !== 'string') return res.status(400).json({ message: "Invalid flight id" });
        const id = parseInt(idParam, 10);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid flight id" });

        await removeFlight(id);
        res.status(200).json({ message: "Flight deleted" });
    } catch (error) {
        const message = (error as Error).message;
        console.error('Delete flight error:', error);
        if (message === 'Flight not found') return res.status(404).json({ message });
        res.status(500).json({ message: "Internal server error" });
    }
};