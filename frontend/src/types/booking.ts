export interface Passenger {
    fullName: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
    email: string;
    contactNumber: string;
}

export interface Booking {
    id: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'failed';
    passenger_count: number;
    total_fare: string;
    created_at: string;
    flight_number: string;
    airline?: string;
    origin: string;
    destination: string;
    departure_date: string;
    user_email?: string;
}

export interface AdminBookingFilters {
    status?: string;
    date?: string;
    origin?: string;
    destination?: string;
}

export interface DashboardStats {
    bookingsToday: number;
    totalRevenue: number;
    cancellationRate: number;
    totalBookings: number;
}
