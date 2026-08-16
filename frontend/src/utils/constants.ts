export const API_URL = 'http://localhost:4000';

export const CANCELLATION_WINDOW_HOURS = 24;

export const AIRPORTS = [
    { code: 'DXB', label: 'Dubai (DXB)' },
    { code: 'AUH', label: 'Abu Dhabi (AUH)' },
    { code: 'COK', label: 'Kochi (COK)' },
    { code: 'CCJ', label: 'Kozhikode / Calicut (CCJ)' },
    { code: 'BLR', label: 'Bangalore (BLR)' },
    { code: 'DEL', label: 'Delhi (DEL)' },
];

export const airportLabel = (code: string) =>
    AIRPORTS.find((a) => a.code === code)?.label || code;
