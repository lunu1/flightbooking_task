import { searchFlights, findFlightById } from '../models/flightModels';

export const getFlights = async (query: {
    origin?: string;
    destination?: string;
    date?: string;
    passengers?: string;
    page?: string;
    limit?: string;
}) => {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '10', 10))); // cap at 50 to avoid abuse
    const passengers = query.passengers ? parseInt(query.passengers, 10) : undefined;

    const { flights, total } = await searchFlights({
        origin: query.origin,
        destination: query.destination,
        date: query.date,
        passengers,
        page,
        limit,
    });

    return {
        flights,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export const getFlightById = async (id: number) => {
    const flight = await findFlightById(id);
    if (!flight) throw new Error('Flight not found');
    return flight;
};