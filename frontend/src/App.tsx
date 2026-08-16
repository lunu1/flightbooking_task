import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Search from './pages/Search';
import BookingForm from './pages/BookingForm';
import MyBookings from './pages/MyBookings';
import BookingSuccess from './pages/BookingSuccess';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<Search />} />
            <Route
                path="/book/:flightId"
                element={
                    <ProtectedRoute>
                        <BookingForm />
                    </ProtectedRoute>
                }
            />
            <Route path="/bookings/:id/success" element={<BookingSuccess />} />
            <Route
                path="/my-bookings"
                element={
                    <ProtectedRoute>
                        <MyBookings />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
