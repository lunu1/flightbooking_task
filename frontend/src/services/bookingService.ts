import api from '../api/client';
import type { Booking, Passenger, AdminBookingFilters, DashboardStats } from '../types/booking';

interface PaginatedBookings {
    bookings: Booking[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const bookingService = {
    async create(flightId: number, passengers: Passenger[]): Promise<Booking> {
        const res = await api.post('/bookings', { flightId, passengers });
        return res.data;
    },

    async createCheckoutSession(bookingId: number): Promise<{ url: string }> {
        const res = await api.post(`/bookings/${bookingId}/checkout`);
        return res.data;
    },

    async cancel(bookingId: number): Promise<{ message: string }> {
        const res = await api.patch(`/bookings/${bookingId}/cancel`);
        return res.data;
    },

    async getMine(status?: string): Promise<PaginatedBookings> {
        const res = await api.get('/bookings/mine', { params: status ? { status } : {} });
        return res.data;
    },

    // admin only
    async getAll(filters: AdminBookingFilters = {}): Promise<PaginatedBookings> {
        const res = await api.get('/admin/bookings', { params: filters });
        return res.data;
    },

    async getDashboardStats(): Promise<DashboardStats> {
        const res = await api.get('/admin/dashboard/stats');
        return res.data;
    },
};
