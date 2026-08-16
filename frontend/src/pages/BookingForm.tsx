import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

interface Passenger {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
    email: string;
    contactNumber: string;
}

const emptyPassenger: Passenger = {
    fullName: '',
    dateOfBirth: '',
    nationality: '',
    passportNumber: '',
    email: '',
    contactNumber: '',
};

const today = new Date().toISOString().split('T')[0];
const minDob = '1900-01-01';

export default function BookingForm() {
    const { flightId } = useParams();
    const navigate = useNavigate();
    const [passengers, setPassengers] = useState<Passenger[]>([{ ...emptyPassenger }]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
        const updated = [...passengers];
        updated[index] = { ...updated[index], [field]: value };
        setPassengers(updated);
    };

    const addPassenger = () => setPassengers([...passengers, { ...emptyPassenger }]);
    const removePassenger = (index: number) => setPassengers(passengers.filter((_, i) => i !== index));

    const validate = (): string | null => {
        for (let i = 0; i < passengers.length; i++) {
            const p = passengers[i];
            const label = `Passenger ${i + 1}`;

            if (p.fullName.trim().length < 2) {
                return `${label}: full name must be at least 2 characters`;
            }
            if (!/^[A-Za-z\s.'-]+$/.test(p.fullName)) {
                return `${label}: full name can only contain letters`;
            }
            if (!p.dateOfBirth) {
                return `${label}: date of birth is required`;
            }
            if (p.dateOfBirth > today) {
                return `${label}: date of birth cannot be in the future`;
            }
            if (p.nationality.trim().length < 2) {
                return `${label}: nationality is required`;
            }
            if (!/^[A-Za-z0-9]{6,9}$/.test(p.passportNumber)) {
                return `${label}: passport number must be 6-9 letters/numbers`;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) {
                return `${label}: enter a valid email`;
            }
            if (!/^\+?[0-9]{7,15}$/.test(p.contactNumber)) {
                return `${label}: enter a valid contact number (7-15 digits, optional +)`;
            }
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        try {
            const bookingRes = await api.post('/bookings', {
                flightId: Number(flightId),
                passengers,
            });

            const checkoutRes = await api.post(`/bookings/${bookingRes.data.id}/checkout`);
            window.location.href = checkoutRes.data.url;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Booking failed');
            setSubmitting(false);
        }
    };

    const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, marginTop: 8 };
    const inputStyle: React.CSSProperties = { width: '100%', padding: 8, boxSizing: 'border-box' };

    return (
        <div style={{ maxWidth: 600, margin: '40px auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back to search</button>
            <h2>Passenger Details</h2>

            <form onSubmit={handleSubmit}>
                {passengers.map((p, i) => (
                    <div key={i} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <h4>Passenger {i + 1}</h4>
                            {passengers.length > 1 && (
                                <button type="button" onClick={() => removePassenger(i)}>Remove</button>
                            )}
                        </div>

                        <label style={labelStyle}>Full Name</label>
                        <input
                            placeholder="e.g. John Doe"
                            value={p.fullName}
                            onChange={(e) => updatePassenger(i, 'fullName', e.target.value)}
                            style={inputStyle}
                            required
                        />

                        <label style={labelStyle}>Date of Birth</label>
                        <input
                            type="date"
                            value={p.dateOfBirth}
                            min={minDob}
                            max={today}
                            onChange={(e) => updatePassenger(i, 'dateOfBirth', e.target.value)}
                            style={inputStyle}
                            required
                        />

                        <label style={labelStyle}>Nationality</label>
                        <input
                            placeholder="e.g. Indian"
                            value={p.nationality}
                            onChange={(e) => updatePassenger(i, 'nationality', e.target.value)}
                            style={inputStyle}
                            required
                        />

                        <label style={labelStyle}>Passport Number</label>
                        <input
                            placeholder="e.g. N1234567"
                            value={p.passportNumber}
                            onChange={(e) => updatePassenger(i, 'passportNumber', e.target.value.toUpperCase())}
                            style={inputStyle}
                            required
                        />

                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            placeholder="e.g. john@example.com"
                            value={p.email}
                            onChange={(e) => updatePassenger(i, 'email', e.target.value)}
                            style={inputStyle}
                            required
                        />

                        <label style={labelStyle}>Contact Number</label>
                        <input
                            placeholder="e.g. +971501234567"
                            value={p.contactNumber}
                            onChange={(e) => updatePassenger(i, 'contactNumber', e.target.value)}
                            style={inputStyle}
                            required
                        />
                    </div>
                ))}

                <button type="button" onClick={addPassenger} style={{ marginBottom: 16 }}>
                    + Add another passenger
                </button>

                {error && <p style={{ color: 'red' }}>{error}</p>}

                <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12 }}>
                    {submitting ? 'Processing...' : 'Continue to Payment'}
                </button>
            </form>
        </div>
    );
}
