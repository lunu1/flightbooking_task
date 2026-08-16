import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { validateFlightForm } from '../utils/flightValidation';

interface Flight {
    id: number;
    flight_number: string;
    airline: string;
    origin: string;
    destination: string;
    departure_date: string;
    fare: string;
    seats_total: number;
    seats_available: number;
}

interface Booking {
    id: number;
    status: string;
    passenger_count: number;
    total_fare: string;
    flight_number: string;
    origin: string;
    destination: string;
    departure_date: string;
    user_email: string;
}

interface Stats {
    bookingsToday: number;
    totalRevenue: number;
    cancellationRate: number;
    totalBookings: number;
}

const emptyFlight = {
    flight_number: '',
    airline: '',
    origin: '',
    destination: '',
    departure_date: '',
    arrival_date: '',
    fare: '',
    seats_total: '',
};

export default function Admin() {
    const [tab, setTab] = useState<'flights' | 'bookings' | 'stats'>('stats');

    return (
        <div style={{ maxWidth: 900, margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2>Admin Panel</h2>
                <Link to="/">← Back to search</Link>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button onClick={() => setTab('stats')} disabled={tab === 'stats'}>Dashboard</button>
                <button onClick={() => setTab('flights')} disabled={tab === 'flights'}>Flights</button>
                <button onClick={() => setTab('bookings')} disabled={tab === 'bookings'}>All Bookings</button>
            </div>

            {tab === 'stats' && <StatsTab />}
            {tab === 'flights' && <FlightsTab />}
            {tab === 'bookings' && <BookingsTab />}
        </div>
    );
}

function StatsTab() {
    const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
        api.get('/admin/dashboard/stats').then((res) => setStats(res.data));
    }, []);

    if (!stats) return <p>Loading...</p>;

    return (
        <div style={{ display: 'flex', gap: 16 }}>
            <StatCard label="Bookings Today" value={stats.bookingsToday} />
            <StatCard label="Total Revenue" value={`${stats.totalRevenue} AED`} />
            <StatCard label="Cancellation Rate" value={`${stats.cancellationRate}%`} />
            <StatCard label="Total Bookings" value={stats.totalBookings} />
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
        </div>
    );
}

function FlightsTab() {
    const [form, setForm] = useState(emptyFlight);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [flights, setFlights] = useState<Flight[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editFare, setEditFare] = useState('');
    const [editSeats, setEditSeats] = useState('');
    const [editError, setEditError] = useState('');

    // search/filter state — separate from the create form
    const [searchOrigin, setSearchOrigin] = useState('');
    const [searchDestination, setSearchDestination] = useState('');
    const [searchDate, setSearchDate] = useState('');
    const [searchFlightNumber, setSearchFlightNumber] = useState('');

    const inputStyle = { padding: 8, marginBottom: 8, width: '100%', boxSizing: 'border-box' as const };

    const fetchFlights = async () => {
        setLoading(true);
        try {
            const params: any = { limit: 50 };
            if (searchOrigin) params.origin = searchOrigin;
            if (searchDestination) params.destination = searchDestination;
            if (searchDate) params.date = searchDate;

            const res = await api.get('/flights/search', { params });
            let results: Flight[] = res.data.flights;

            // flight number filter is client-side since the search endpoint doesn't support it
            if (searchFlightNumber) {
                results = results.filter((f) =>
                    f.flight_number.toUpperCase().includes(searchFlightNumber.toUpperCase())
                );
            }

            setFlights(results);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlights();
    }, [searchOrigin, searchDestination, searchDate]);

    const clearFilters = () => {
        setSearchOrigin('');
        setSearchDestination('');
        setSearchDate('');
        setSearchFlightNumber('');
    };

    const updateField = (field: string, value: string) => setForm({ ...form, [field]: value });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const validationError = validateFlightForm(form);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            await api.post('/admin/flights', {
                ...form,
                flight_number: form.flight_number.toUpperCase(),
                origin: form.origin.toUpperCase(),
                destination: form.destination.toUpperCase(),
                fare: Number(form.fare),
                seats_total: Number(form.seats_total),
            });
            setSuccess('Flight created');
            setForm(emptyFlight);
            fetchFlights();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create flight');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(`Delete flight ${id}?`)) return;
        setError('');
        setSuccess('');
        try {
            await api.delete(`/admin/flights/${id}`);
            setSuccess(`Flight ${id} deleted`);
            fetchFlights();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete flight');
        }
    };

    const startEdit = (f: Flight) => {
        setEditingId(f.id);
        setEditFare(f.fare);
        setEditSeats(String(f.seats_total));
        setEditError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditFare('');
        setEditSeats('');
        setEditError('');
    };

    const saveEdit = async (id: number) => {
        setEditError('');
        const fare = Number(editFare);
        const seats = Number(editSeats);

        if (isNaN(fare) || fare <= 0) {
            setEditError('Fare must be a positive number');
            return;
        }
        if (isNaN(seats) || !Number.isInteger(seats) || seats <= 0) {
            setEditError('Seats must be a positive whole number');
            return;
        }

        try {
            await api.patch(`/admin/flights/${id}`, { fare, seats_total: seats });
            setSuccess(`Flight ${id} updated`);
            cancelEdit();
            fetchFlights();
        } catch (err: any) {
            setEditError(err.response?.data?.message || 'Failed to update flight');
        }
    };

    const selectStyle = { padding: 8 };

    return (
        <div>
            <h4>Create Flight</h4>
            <form onSubmit={handleCreate} style={{ maxWidth: 400, marginBottom: 16 }}>
                <input
                    placeholder="Flight Number (e.g. EK123)"
                    maxLength={10}
                    value={form.flight_number}
                    onChange={(e) => updateField('flight_number', e.target.value.toUpperCase())}
                    style={inputStyle}
                    required
                />
                <input
                    placeholder="Airline"
                    maxLength={100}
                    value={form.airline}
                    onChange={(e) => updateField('airline', e.target.value)}
                    style={inputStyle}
                    required
                />
                <input
                    placeholder="Origin code (e.g. DXB)"
                    maxLength={3}
                    value={form.origin}
                    onChange={(e) => updateField('origin', e.target.value.toUpperCase())}
                    style={inputStyle}
                    required
                />
                <input
                    placeholder="Destination code (e.g. COK)"
                    maxLength={3}
                    value={form.destination}
                    onChange={(e) => updateField('destination', e.target.value.toUpperCase())}
                    style={inputStyle}
                    required
                />
                <label style={{ fontSize: 12 }}>Departure</label>
                <input
                    type="datetime-local"
                    value={form.departure_date}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => updateField('departure_date', e.target.value)}
                    style={inputStyle}
                    required
                />
                <label style={{ fontSize: 12 }}>Arrival</label>
                <input
                    type="datetime-local"
                    value={form.arrival_date}
                    min={form.departure_date || undefined}
                    onChange={(e) => updateField('arrival_date', e.target.value)}
                    style={inputStyle}
                    required
                />
                <input
                    type="number"
                    placeholder="Fare (AED)"
                    min="1"
                    step="0.01"
                    value={form.fare}
                    onChange={(e) => updateField('fare', e.target.value)}
                    style={inputStyle}
                    required
                />
                <input
                    type="number"
                    placeholder="Total Seats"
                    min="1"
                    max="1000"
                    step="1"
                    value={form.seats_total}
                    onChange={(e) => updateField('seats_total', e.target.value)}
                    style={inputStyle}
                    required
                />
                <button type="submit">Create Flight</button>
            </form>

            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}

            <h4>Manage Existing Flights</h4>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
                <input
                    placeholder="Origin (e.g. DXB)"
                    maxLength={3}
                    value={searchOrigin}
                    onChange={(e) => setSearchOrigin(e.target.value.toUpperCase())}
                    style={{ ...selectStyle, width: 120 }}
                />
                <input
                    placeholder="Destination (e.g. COK)"
                    maxLength={3}
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value.toUpperCase())}
                    style={{ ...selectStyle, width: 140 }}
                />
                <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    style={selectStyle}
                    title="Filter by departure date"
                />
                <input
                    placeholder="Flight number"
                    value={searchFlightNumber}
                    onChange={(e) => setSearchFlightNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchFlights()}
                    style={{ ...selectStyle, width: 140 }}
                />
                <button onClick={fetchFlights}>Search</button>
                <button onClick={clearFilters}>Clear</button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && flights.length === 0 && <p>No flights match these filters.</p>}
            {editError && <p style={{ color: 'red' }}>{editError}</p>}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                        <th style={{ padding: 8 }}>ID</th>
                        <th style={{ padding: 8 }}>Airline</th>
                        <th style={{ padding: 8 }}>Flight No.</th>
                        <th style={{ padding: 8 }}>Route</th>
                        <th style={{ padding: 8 }}>Departure</th>
                        <th style={{ padding: 8 }}>Fare</th>
                        <th style={{ padding: 8 }}>Seats (total)</th>
                        <th style={{ padding: 8 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {flights.map((f) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: 8 }}>{f.id}</td>
                            <td style={{ padding: 8 }}>{f.airline}</td>
                            <td style={{ padding: 8 }}>{f.flight_number}</td>
                            <td style={{ padding: 8 }}>{f.origin} → {f.destination}</td>
                            <td style={{ padding: 8 }}>{new Date(f.departure_date).toLocaleDateString()}</td>
                            <td style={{ padding: 8 }}>
                                {editingId === f.id ? (
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={editFare}
                                        onChange={(e) => setEditFare(e.target.value)}
                                        style={{ width: 80, padding: 4 }}
                                    />
                                ) : (
                                    `${f.fare} AED`
                                )}
                            </td>
                            <td style={{ padding: 8 }}>
                                {editingId === f.id ? (
                                    <input
                                        type="number"
                                        min="1"
                                        max="1000"
                                        step="1"
                                        value={editSeats}
                                        onChange={(e) => setEditSeats(e.target.value)}
                                        style={{ width: 60, padding: 4 }}
                                    />
                                ) : (
                                    f.seats_total
                                )}
                            </td>
                            <td style={{ padding: 8 }}>
                                {editingId === f.id ? (
                                    <>
                                        <button onClick={() => saveEdit(f.id)} style={{ marginRight: 4 }}>Save</button>
                                        <button onClick={cancelEdit}>Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(f)} style={{ marginRight: 4 }}>Edit</button>
                                        <button onClick={() => handleDelete(f.id)}>Delete</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function BookingsTab() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [status, setStatus] = useState('');
    const [date, setDate] = useState('');
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const fetchBookings = async () => {
        setLoading(true);
        const params: any = {};
        if (status) params.status = status;
        if (date) params.date = date;
        if (origin) params.origin = origin;
        if (destination) params.destination = destination;
        const res = await api.get('/admin/bookings', { params });
        setBookings(res.data.bookings);
        setLoading(false);
    };

    useEffect(() => {
        fetchBookings();
    }, [status, date, origin, destination]);

    const handleCancel = async (id: number) => {
        if (!confirm(`Cancel booking ${id}? This issues a refund and releases the seat, bypassing the 24h window.`)) return;
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

    const selectStyle = { padding: 8 };

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="failed">Failed</option>
                </select>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={selectStyle}
                    title="Filter by departure date"
                />

                <input
                    placeholder="Origin (e.g. DXB)"
                    maxLength={3}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                    style={{ ...selectStyle, width: 120 }}
                />

                <input
                    placeholder="Destination (e.g. COK)"
                    maxLength={3}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value.toUpperCase())}
                    style={{ ...selectStyle, width: 140 }}
                />

                <button onClick={() => { setStatus(''); setDate(''); setOrigin(''); setDestination(''); }}>
                    Clear filters
                </button>
            </div>

            {loading && <p>Loading...</p>}
            {!loading && bookings.length === 0 && <p>No bookings match these filters.</p>}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                        <th style={{ padding: 8 }}>ID</th>
                        <th style={{ padding: 8 }}>User</th>
                        <th style={{ padding: 8 }}>Flight</th>
                        <th style={{ padding: 8 }}>Route</th>
                        <th style={{ padding: 8 }}>Departure</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Fare</th>
                        <th style={{ padding: 8 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {bookings.map((b) => (
                        <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: 8 }}>{b.id}</td>
                            <td style={{ padding: 8 }}>{b.user_email}</td>
                            <td style={{ padding: 8 }}>{b.flight_number}</td>
                            <td style={{ padding: 8 }}>{b.origin} → {b.destination}</td>
                            <td style={{ padding: 8 }}>{new Date(b.departure_date).toLocaleDateString()}</td>
                            <td style={{ padding: 8 }}>{b.status}</td>
                            <td style={{ padding: 8 }}>{b.total_fare} AED</td>
                            <td style={{ padding: 8 }}>
                                {b.status === 'confirmed' && (
                                    <button
                                        onClick={() => handleCancel(b.id)}
                                        disabled={cancellingId === b.id}
                                    >
                                        {cancellingId === b.id ? 'Cancelling...' : 'Cancel + Refund'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
