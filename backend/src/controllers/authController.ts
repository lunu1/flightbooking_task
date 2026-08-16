import { Request, Response } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser } from "../services/authService";
import { LoginBody } from "../types/auth.types";
import { getRefreshCookieOptions } from "../utils/cookieOptions";
import { findUserById } from '../models/userModel';
import jwt from 'jsonwebtoken';
import { AuthRequest } from "../middleware/authenticate";


export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await registerUser(email, password); 

        res.status(201).json(user);
    } catch (error) {
        const message = (error as Error).message;
        if (message === 'User already exists') {
            res.status(409).json({ message });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

export const login = async (req:Request<{}, {}, LoginBody>, res:Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const { accessToken, refreshToken, user } = await loginUser(email, password);


        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());
        res.status(200).json({ accessToken, user });
    } catch (error) {
        console.error("Login error:", error);
        const message = (error as Error).message;  
        if (message === 'Invalid credentials') {
            res.status(401).json({ message });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
}

export const refresh = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ message: "No refresh token provided" });
        }

        const { accessToken, refreshToken } = await refreshAccessToken(token);

        res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

        res.status(200).json({ accessToken });
    } catch (error) {
        console.error('Refresh error:', error);
        res.status(401).json({ message: "Invalid or expired refresh token" });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        const user = await findUserById(req.user!.userId);
        if (!user) return res.status(404).json({ message: "User not found" });
        const { password_hash, refresh_token, ...safeUser } = user;
        res.status(200).json(safeUser);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// controllers/authController.ts
export const logout = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { userId: number };
            await logoutUser(payload.userId);
        }
    } catch (error) {
        console.error('Logout token verify error:', error);
    }

    res.clearCookie('refreshToken', getRefreshCookieOptions());
    res.status(200).json({ message: "Logged out" });
};