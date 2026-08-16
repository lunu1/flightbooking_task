import api from '../api/client';
import type { Flight, FlightSearchFilters, CreateFlightInput, UpdateFlightInput } from '../types/flight';

interface PaginatedFlights {
    flights: Flight[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const flightService = {
    async search(filters: FlightSearchFilters = {}, limit = 20): Promise<PaginatedFlights> {
        const res = await api.get('/flights/search', { params: { ...filters, limit } });
        return res.data;
    },

    async getById(id: number): Promise<Flight> {
        const res = await api.get(`/flights/${id}`);
        return res.data;
    },

    // admin only
    async create(data: CreateFlightInput): Promise<Flight> {
        const res = await api.post('/admin/flights', data);
        return res.data;
    },

    async update(id: number, data: UpdateFlightInput): Promise<Flight> {
        const res = await api.patch(`/admin/flights/${id}`, data);
        return res.data;
    },

    async remove(id: number): Promise<void> {
        await api.delete(`/admin/flights/${id}`);
    },
};
