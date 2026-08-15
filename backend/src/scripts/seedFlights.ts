import pool from '../config/db';

const airlines = ['Emirates', 'Etihad', 'Air India Express', 'IndiGo', 'flydubai'];
const routes = [
    { origin: 'DXB', destination: 'COK' },
    { origin: 'COK', destination: 'DXB' },
    { origin: 'DXB', destination: 'BLR' },
    { origin: 'BLR', destination: 'DXB' },
    { origin: 'DXB', destination: 'CCJ' },
    { origin: 'CCJ', destination: 'DXB' },
    { origin: 'AUH', destination: 'COK' },
    { origin: 'DXB', destination: 'DEL' },
];

const randomFare = () => Math.floor(Math.random() * (1200 - 250 + 1) + 250);
const randomSeats = () => Math.floor(Math.random() * (180 - 30 + 1) + 30);

const seedFlights = async () => {
    const flights = [];

    for (let i = 0; i < 60; i++) {
        const route = routes[Math.floor(Math.random() * routes.length)];
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const daysFromNow = Math.floor(Math.random() * 60) + 1; // next 60 days
        const departure = new Date();
        departure.setDate(departure.getDate() + daysFromNow);
        departure.setHours(Math.floor(Math.random() * 24), 0, 0, 0);

        const arrival = new Date(departure);
        arrival.setHours(arrival.getHours() + 3 + Math.floor(Math.random() * 5)); // 3-8 hr flight

        const seatsTotal = randomSeats();

        flights.push({
            flight_number: `${airline.slice(0, 2).toUpperCase()}${100 + i}`,
            airline,
            origin: route.origin,
            destination: route.destination,
            departure_date: departure,
            arrival_date: arrival,
            fare: randomFare(),
            seats_total: seatsTotal,
            seats_available: seatsTotal,
        });
    }

    for (const f of flights) {
        await pool.query(
            `INSERT INTO flights 
             (flight_number, airline, origin, destination, departure_date, arrival_date, fare, seats_total, seats_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [f.flight_number, f.airline, f.origin, f.destination, f.departure_date, f.arrival_date, f.fare, f.seats_total, f.seats_available]
        );
    }

    console.log(`Seeded ${flights.length} flights.`);
    process.exit(0);
};

seedFlights().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});