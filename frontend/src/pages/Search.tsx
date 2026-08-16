import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Flight {
    id: number;
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date: string;
    fare: string;
    seats_available: number;
}

export default function Search() {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const params: any = {};
            if (origin) params.origin = origin;
            if (destination) params.destination = destination;
            if (date) params.date = date;

            const res = await api.get('/flights/search', { params });
            setFlights(res.data.flights);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (flightId: number) => {
        if (!user) {
            navigate('/login');
            return;
        }
        navigate(`/book/${flightId}`);
    };

    return (
        <div style={{ maxWidth: 800, margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>Flight Search</h2>
                {user ? (
                    <div>
                        <Link to="/my-bookings" style={{ marginRight: 12 }}>My Bookings</Link>
                        {user.role === 'admin' && (
                            <Link to="/admin" style={{ marginRight: 12 }}>Admin</Link>
                        )}
                        <button onClick={logout}>Logout</button>
                    </div>
                ) : (
                    <Link to="/login">Login</Link>
                )}
            </div>

            <form onSubmit={handleSearch} style={{ marginBottom: 24 }}>
                <input
                    placeholder="Origin (e.g. DXB)"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    style={{ marginRight: 8, padding: 8 }}
                />
                <input
                    placeholder="Destination (e.g. COK)"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={{ marginRight: 8, padding: 8 }}
                />
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ marginRight: 8, padding: 8 }}
                />
                <button type="submit">Search</button>
            </form>

            {loading && <p>Loading...</p>}

            {flights.map((flight) => (
                <div
                    key={flight.id}
                    style={{
                        border: '1px solid #ccc',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <div>
                        <strong>{flight.airline}</strong> — {flight.flight_number}
                        <br />
                        {flight.origin} → {flight.destination}
                        <br />
                        {new Date(flight.departure_date).toLocaleString()}
                        <br />
                        Fare: {flight.fare} AED — {flight.seats_available} seats left
                    </div>
                    <button onClick={() => handleSelect(flight.id)}>Select</button>
                </div>
            ))}
        </div>
    );
}
