import axios from 'axios';

const API_URL = 'http://localhost:4000';

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
};

export const getAccessToken = () => accessToken;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

let isRefreshing = false;
let refreshQueue: (() => void)[] = [];

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // don't try to refresh if the failing request WAS the refresh call itself
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/refresh')
        ) {
            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve) => {
                    refreshQueue.push(() => resolve(api(originalRequest)));
                });
            }

            isRefreshing = true;
            try {
                const res = await axios.post(
                    `${API_URL}/auth/refresh`,
                    {},
                    { withCredentials: true }
                );
                setAccessToken(res.data.accessToken);
                refreshQueue.forEach((cb) => cb());
                refreshQueue = [];
                return api(originalRequest);
            } catch (refreshError) {
                setAccessToken(null);
                refreshQueue = [];
                // no hard redirect here — let ProtectedRoute handle navigation
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
