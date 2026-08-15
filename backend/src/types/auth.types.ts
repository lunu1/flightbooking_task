export interface LoginBody {
  email: string;
  password: string;
}


//payload access token - useful for authenticate middleware 
export interface AccessTokenPayload {
    userId: number;
    role: string;
}

//payload for refresh token

export interface RefreshTokenPayload {
    userId: number;
}