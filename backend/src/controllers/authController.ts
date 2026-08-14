import { Request, Response } from "express";
import { registerUser } from "../services/authService";

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