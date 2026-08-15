import { Request, Response } from "express";
import { getFlights, getFlightById } from "../services/flightServices";

export const searchFlightsHandler = async (req: Request, res: Response) => {
  try {
    const flights = await getFlights(req.query as any);
    res.status(200).json(flights);
  } catch (error) {
    console.error("Search flights error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFlightHandler = async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    if (!idParam || typeof idParam !== "string") {
      return res.status(400).json({ message: "Invalid flight id" });
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid flight id" });
    }

    const flight = await getFlightById(id);
    res.status(200).json(flight);
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Flight not found") {
      return res.status(404).json({ message });
    }
    console.error("Get flight error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
