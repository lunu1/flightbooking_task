import pool from '../config/db';

interface FlightSearchParams {
    origin?: string | undefined;
    destination?: string | undefined;
    date?: string | undefined;
    passengers?: number | undefined;
    page: number;
    limit: number;
}
export const searchFlights = async (params: FlightSearchParams) => {
    const { origin, destination, date, passengers, page, limit } = params;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (origin) {
        conditions.push(`origin = $${idx++}`);
        values.push(origin.toUpperCase());
    }
    if (destination) {
        conditions.push(`destination = $${idx++}`);
        values.push(destination.toUpperCase());
    }
    if (date) {
        conditions.push(`departure_date::date = $${idx++}`);
        values.push(date);
    }
    if (passengers) {
        conditions.push(`seats_available >= $${idx++}`);
        values.push(passengers);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    // lean payload — only fields the frontend actually needs to display
    const dataQuery = `
        SELECT id, flight_number, airline, origin, destination, 
               departure_date, arrival_date, fare, seats_available
        FROM flights
        ${whereClause}
        ORDER BY departure_date ASC
        LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM flights ${whereClause}`;
    const countValues = values.slice(0, values.length - 2); // exclude limit/offset

    const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, values),
        pool.query(countQuery, countValues),
    ]);

    return {
        flights: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
    };
};

export const findFlightById = async (id: number) => {
    const result = await pool.query('SELECT * FROM flights WHERE id = $1', [id]);
    return result.rows[0] || null;
};

export const createFlight = async (flight: {
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string;
    fare: number;
    seats_total: number;
}) => {
    const result = await pool.query(
        `INSERT INTO flights 
         (flight_number, airline, origin, destination, departure_date, arrival_date, fare, seats_total, seats_available)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
        [
            flight.flight_number,
            flight.airline,
            flight.origin.toUpperCase(),
            flight.destination.toUpperCase(),
            flight.departure_date,
            flight.arrival_date,
            flight.fare,
            flight.seats_total,
        ]
    );
    return result.rows[0];
};

export const updateFlight = async (id: number, updates: Partial<{
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string;
    fare: number;
    seats_total: number;
}>) => {
    const fields = Object.keys(updates);
    if (fields.length === 0) return findFlightById(id);

    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const values = Object.values(updates);

    const result = await pool.query(
        `UPDATE flights SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
    );
    return result.rows[0] || null;
};

export const deleteFlight = async (id: number) => {
    const result = await pool.query('DELETE FROM flights WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
};