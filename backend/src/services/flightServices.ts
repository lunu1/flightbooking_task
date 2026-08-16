import { searchFlights, findFlightById ,createFlight, updateFlight, deleteFlight} from '../models/flightModels';

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

export const addFlight = async (data: any) => {
    const required = ['flight_number', 'airline', 'origin', 'destination', 'departure_date', 'arrival_date', 'fare', 'seats_total'];
    for (const field of required) {
        if (data[field] === undefined || data[field] === null) {
            throw new Error(`${field} is required`);
        }
    }
    return createFlight(data);
};

export const editFlight = async (id: number, data: any) => {
    const flight = await findFlightById(id);
    if (!flight) throw new Error('Flight not found');
    return updateFlight(id, data);
};

export const removeFlight = async (id: number) => {
    const flight = await deleteFlight(id);
    if (!flight) throw new Error('Flight not found');
    return flight;
};