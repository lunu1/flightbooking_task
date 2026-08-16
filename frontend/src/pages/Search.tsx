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

const AIRPORTS = [
    { code: 'DXB', label: 'Dubai (DXB)' },
    { code: 'AUH', label: 'Abu Dhabi (AUH)' },
    { code: 'COK', label: 'Kochi (COK)' },
    { code: 'CCJ', label: 'Kozhikode / Calicut (CCJ)' },
    { code: 'BLR', label: 'Bangalore (BLR)' },
    { code: 'DEL', label: 'Delhi (DEL)' },
];

export default function Search() {
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const airportLabel = (code: string) =>
        AIRPORTS.find((a) => a.code === code)?.label || code;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSearched(true);
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
                        {user.role !== 'admin' && (
                            <Link to="/my-bookings" style={{ marginRight: 12 }}>My Bookings</Link>
                        )}
                        {user.role === 'admin' && (
                            <Link to="/admin" style={{ marginRight: 12 }}>Admin</Link>
                        )}
                        <button onClick={logout}>Logout</button>
                    </div>
                ) : (
                    <Link to="/login">Login</Link>
                )}
            </div>

            <form onSubmit={handleSearch} style={{ marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    style={{ padding: 8 }}
                >
                    <option value="">From (any)</option>
                    {AIRPORTS.map((a) => (
                        <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                </select>

                <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={{ padding: 8 }}
                >
                    <option value="">To (any)</option>
                    {AIRPORTS.map((a) => (
                        <option key={a.code} value={a.code}>{a.label}</option>
                    ))}
                </select>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ padding: 8 }}
                />
                <button type="submit">Search</button>
            </form>

            {loading && <p>Loading...</p>}
            {!loading && searched && flights.length === 0 && <p>No flights found.</p>}

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
                        {airportLabel(flight.origin)} → {airportLabel(flight.destination)}
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
