import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { setAccessToken } from '../api/client';

const API_URL = 'http://localhost:4000';

interface User {
    id: number;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const tryRefresh = async () => {
            try {
                const res = await axios.post(
                    `${API_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                if (cancelled) return;
                setAccessToken(res.data.accessToken);

                const meRes = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${res.data.accessToken}` },
                });
                if (!cancelled) setUser(meRes.data);
            } catch {
                if (!cancelled) {
                    setAccessToken(null);
                    setUser(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        tryRefresh();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = async (email: string, password: string) => {
        const res = await axios.post(
            `${API_URL}/auth/login`,
            { email, password },
            { withCredentials: true }
        );
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
    };

    const register = async (email: string, password: string) => {
        await axios.post(
            `${API_URL}/auth/register`,
            { email, password },
            { withCredentials: true }
        );
    };

    const logout = async () => {
        await axios.post(
            `${API_URL}/auth/logout`,
            {},
            { withCredentials: true }
        );
        setAccessToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
