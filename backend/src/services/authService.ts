import bcrypt from 'bcrypt';
import {findUserByEmail, createUser} from '../models/userModel';

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