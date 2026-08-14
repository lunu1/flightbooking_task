import { Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService";
import { LoginBody } from "../types/auth.types";

export const register = async (req:Request, res:Response) => {
try{
    const { email, password, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({message: "Email and password are required"});
    }
    const user = await registerUser(email, password, role);

    res.status(201).json(user);
}catch (error) {
    const message = ( error as Error).message;
if (message === 'User already exists') {
    res.status(409).json({message});
    return;
}
    res.status(500).json({message: "Internal server error"});

}
}


export const login = async (req:Request<{}, {}, LoginBody>, res:Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const { accessToken, refreshToken, user } = await loginUser(email, password);


        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/auth',
            maxAge: 7 * 24 * 60 * 60 * 1000, //7 days lives the token
        });

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