import axios from 'axios';
import { setAccessToken } from '../api/client';
import { API_URL } from '../utils/constants';
import type { User } from '../types/auth';

export const authService = {
    async login(email: string, password: string) {
        const res = await axios.post(
            `${API_URL}/auth/login`,
            { email, password },
            { withCredentials: true }
        );
        setAccessToken(res.data.accessToken);
        return res.data.user as User;
    },

    async register(email: string, password: string) {
        await axios.post(
            `${API_URL}/auth/register`,
            { email, password },
            { withCredentials: true }
        );
    },

    async logout() {
        await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
        setAccessToken(null);
    },

    // deliberately bypasses the `api` instance's interceptor to avoid
    // triggering a second refresh attempt if this call itself 401s
    async silentRefresh(): Promise<User | null> {
        try {
            const res = await axios.post(
                `${API_URL}/auth/refresh`,
                {},
                { withCredentials: true }
            );
            setAccessToken(res.data.accessToken);

            const meRes = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${res.data.accessToken}` },
            });
            return meRes.data as User;
        } catch {
            setAccessToken(null);
            return null;
        }
    },
};
