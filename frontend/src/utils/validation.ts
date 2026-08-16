import { Passenger } from '../types/booking';
import { CANCELLATION_WINDOW_HOURS } from './constants';

const today = new Date().toISOString().split('T')[0];

export const dobLimits = {
    min: '1900-01-01',
    max: today,
};

export const validatePassengers = (passengers: Passenger[]): string | null => {
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

export const isBookingCancellable = (status: string, departureDate: string): boolean => {
    if (status !== 'confirmed') return false;
    const hoursUntilDeparture =
        (new Date(departureDate).getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilDeparture >= CANCELLATION_WINDOW_HOURS;
};
