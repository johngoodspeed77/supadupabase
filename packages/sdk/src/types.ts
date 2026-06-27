export interface SupaDupaBaseClientOptions {
  /** Data API base URL (REST). In production, same host as auth behind Caddy. */
  url: string;
  /** Auth service URL. Defaults to `url` when omitted. */
  authUrl?: string;
  anonKey?: string;
  accessToken?: string;
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

export interface SignUpCredentials {
  email: string;
  password: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface QueryResult<T = Record<string, unknown>> {
  data: T[] | null;
  error: { message: string; status?: number } | null;
}

export interface InsertResult<T = Record<string, unknown>> {
  data: T[] | null;
  error: { message: string; status?: number } | null;
}
