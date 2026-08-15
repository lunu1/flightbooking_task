import { CookieOptions } from 'express';

export const getRefreshCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});