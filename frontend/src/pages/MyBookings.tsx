import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface Booking {
    id: number;
    status: string;
    passenger_count: number;
    total_fare: string;
    created_at: string;
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
}

export default function MyBookings() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/bookings/mine');
            setBookings(res.data.bookings);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const handleCancel = async (id: number) => {
        if (!confirm('Cancel this booking?')) return;
        setCancellingId(id);
        try {
            await api.patch(`/bookings/${id}/cancel`);
            await fetchBookings();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Cancellation failed');
        } finally {
            setCancellingId(null);
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#0a7';
            case 'pending': return '#e90';
            case 'cancelled': return '#999';
            case 'failed': return '#d33';
            default: return '#333';
        }
    };

    return (
        <div style={{ maxWidth: 700, margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>My Bookings</h2>
                <Link to="/">← Back to search</Link>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && bookings.length === 0 && <p>No bookings yet.</p>}

            {bookings.map((b) => (
                <div
                    key={b.id}
                    style={{
                        border: '1px solid #ccc',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{b.airline} — {b.flight_number}</strong>
                        <span style={{ color: statusColor(b.status), fontWeight: 600 }}>
                            {b.status.toUpperCase()}
                        </span>
                    </div>
                    <div>{b.origin} → {b.destination}</div>
                    <div>{new Date(b.departure_date).toLocaleString()}</div>
                    <div>{b.passenger_count} passenger(s) — {b.total_fare} AED</div>

                    {b.status === 'confirmed' && (
                        <button
                            onClick={() => handleCancel(b.id)}
                            disabled={cancellingId === b.id}
                            style={{ marginTop: 8 }}
                        >
                            {cancellingId === b.id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
