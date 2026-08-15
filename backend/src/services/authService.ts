import bcrypt from 'bcrypt';
import {findUserByEmail, createUser, updateRefreshToken, findUserById} from '../models/userModel';
import {generateAccessToken, generateRefreshToken} from '../services/tokenService';


export const registerUser = async (
    email: string, password: string, role: string = "user"
) => {
const existingUser = await findUserByEmail(email);
if (existingUser) {
    throw new Error('User already exists');
}

const passwordHash = await bcrypt.hash(password,10);
const user = await createUser(email, passwordHash, role);
const {password_hash, ...userWithoutPassword} = user;
return userWithoutPassword;

};


export const loginUser = async (email: string, password: string) => {
    const user = await findUserByEmail(email);
    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);


    await updateRefreshToken(user.id, refreshToken);
 const { password_hash, refresh_token,...userWithoutPassword } = user;


    return { accessToken, refreshToken, user: userWithoutPassword };
};


export const refreshAccessToken = async (refreshToken: string) => {
    let payload: { userId: number };
    try {
        payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: number };
    } catch {
        throw new Error('Invalid refresh token');
    }

    const user = await findUserById(payload.userId);
    if (!user || user.refresh_token !== refreshToken) {
        // token doesn't match what's stored — expired, already rotated, or logged out
        throw new Error('Invalid refresh token');
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    await updateRefreshToken(user.id, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};