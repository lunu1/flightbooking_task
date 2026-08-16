import { Link, useParams } from 'react-router-dom';

export default function BookingSuccess() {
    const { id } = useParams();

    return (
        <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
            <h2 style={{ color: '#0a7' }}>Payment Successful</h2>
            <p>Your booking #{id} has been confirmed.</p>
            <Link to="/my-bookings">View My Bookings</Link>
        </div>
    );
}
