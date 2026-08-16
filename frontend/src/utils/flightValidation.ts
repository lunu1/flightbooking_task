interface FlightFormInput {
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string;
    fare: string;
    seats_total: string;
}

const MIN_FLIGHT_DURATION_MINUTES = 30;

export const validateFlightForm = (form: FlightFormInput): string | null => {
    if (!form.flight_number.trim() || form.flight_number.length > 10) {
        return 'Flight number is required and must be 10 characters or fewer';
    }
    if (!/^[A-Za-z0-9]+$/.test(form.flight_number)) {
        return 'Flight number can only contain letters and numbers';
    }

    if (!form.airline.trim() || form.airline.length > 100) {
        return 'Airline is required and must be 100 characters or fewer';
    }

    if (!/^[A-Za-z]{3}$/.test(form.origin)) {
        return 'Origin must be exactly 3 letters (e.g. DXB)';
    }
    if (!/^[A-Za-z]{3}$/.test(form.destination)) {
        return 'Destination must be exactly 3 letters (e.g. COK)';
    }
    if (form.origin.toUpperCase() === form.destination.toUpperCase()) {
        return 'Origin and destination cannot be the same';
    }

    if (!form.departure_date) {
        return 'Departure date/time is required';
    }
    if (!form.arrival_date) {
        return 'Arrival date/time is required';
    }

    const departure = new Date(form.departure_date).getTime();
    const arrival = new Date(form.arrival_date).getTime();

    if (departure <= Date.now()) {
        return 'Departure must be in the future';
    }
    if (arrival <= departure) {
        return 'Arrival must be after departure';
    }
    const gapMinutes = (arrival - departure) / (1000 * 60);
    if (gapMinutes < MIN_FLIGHT_DURATION_MINUTES) {
        return `Flight duration must be at least ${MIN_FLIGHT_DURATION_MINUTES} minutes`;
    }

    const fare = Number(form.fare);
    if (!form.fare || isNaN(fare) || fare <= 0) {
        return 'Fare must be a positive number';
    }

    const seats = Number(form.seats_total);
    if (!form.seats_total || isNaN(seats) || !Number.isInteger(seats) || seats <= 0) {
        return 'Total seats must be a positive whole number';
    }
    if (seats > 1000) {
        return 'Total seats seems unrealistic — check the value';
    }

    return null;
};
