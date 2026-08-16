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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
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
                        <input
                            placeholder="Full Name"
                            value={p.fullName}
                            onChange={(e) => updatePassenger(i, 'fullName', e.target.value)}
                            style={{ width: '100%', padding: 8, marginBottom: 8 }}
                            required
                        />
                        <input
                            type="date"
                            placeholder="Date of Birth"
                            value={p.dateOfBirth}
                            onChange={(e) => updatePassenger(i, 'dateOfBirth', e.target.value)}
                            style={{ width: '100%', padding: 8, marginBottom: 8 }}
                            required
                        />
                        <input
                            placeholder="Nationality"
                            value={p.nationality}
                            onChange={(e) => updatePassenger(i, 'nationality', e.target.value)}
                            style={{ width: '100%', padding: 8, marginBottom: 8 }}
                            required
                        />
                        <input
                            placeholder="Passport Number"
                            value={p.passportNumber}
                            onChange={(e) => updatePassenger(i, 'passportNumber', e.target.value)}
                            style={{ width: '100%', padding: 8, marginBottom: 8 }}
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={p.email}
                            onChange={(e) => updatePassenger(i, 'email', e.target.value)}
                            style={{ width: '100%', padding: 8, marginBottom: 8 }}
                            required
                        />
                        <input
                            placeholder="Contact Number"
                            value={p.contactNumber}
                            onChange={(e) => updatePassenger(i, 'contactNumber', e.target.value)}
                            style={{ width: '100%', padding: 8, marginBottom: 8 }}
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
