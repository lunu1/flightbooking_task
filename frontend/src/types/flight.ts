export interface Flight {
    id: number;
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string;
    fare: string;
    seats_total: number;
    seats_available: number;
}

export interface FlightSearchFilters {
    origin?: string;
    destination?: string;
    date?: string;
}

export interface CreateFlightInput {
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string;
    fare: number;
    seats_total: number;
}

export interface UpdateFlightInput {
    fare?: number;
    seats_total?: number;
}
