import pool from '../config/db';

export const findUserByEmail = async (email: string) => {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return result.rows[0];
};

export const createUser = async (email: string, passwordHash: string, role: string = "user") => {
    const result = await pool.query(
        'INSERT INTO users (email,  password_hash, role) VALUES ($1, $2, $3) RETURNING *',
        [email.toLowerCase(), passwordHash, role]
    );
    return result.rows[0];
}

export const updateRefreshToken = async (userId: number, refreshToken: string | null) => {
    const result = await pool.query(
        'UPDATE users SET refresh_token = $1 WHERE id = $2 RETURNING *',
        [refreshToken, userId]
    );
    return result.rows[0];
};

export const findUserById = async (id: number) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    );
    return result.rows[0] || null;
};