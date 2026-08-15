import jwt from "jsonwebtoken";
import { AccessTokenPayload } from "../types/auth.types";

export const generateAccessToken = (userId: number, role: string) => {
  const payload: AccessTokenPayload = { userId, role };
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "15m",
  });
};
export const generateRefreshToken = (userId: number) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: "7d",
  });
};
