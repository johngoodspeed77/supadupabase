export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
  aud?: string;
  iat: number;
  exp: number;
  iss?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'bearer';
  user: AuthUser;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  status: number;
}
