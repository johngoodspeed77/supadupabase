import type {
  SupaDupaBaseClientOptions,
  AuthSession,
  AuthUser,
  SignInCredentials,
  SignUpCredentials,
  QueryResult,
  InsertResult,
} from './types.js';

class QueryBuilder<T = Record<string, unknown>> implements PromiseLike<QueryResult<T>> {
  private columns = '*';
  private filters: Array<{ column: string; value: string }> = [];
  private limitValue?: number;

  constructor(
    private readonly baseUrl: string,
    private readonly table: string,
    private getHeaders: () => Record<string, string>,
  ) {}

  select(columns = '*'): this {
    this.columns = columns;
    return this;
  }

  eq(column: string, value: string | number | boolean): this {
    this.filters.push({ column, value: String(value) });
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute(): Promise<QueryResult<T>> {
    const params = new URLSearchParams({ select: this.columns });
    for (const f of this.filters) {
      params.set(f.column, `eq.${f.value}`);
    }
    if (this.limitValue !== undefined) {
      params.set('limit', String(this.limitValue));
    }

    const res = await fetch(`${this.baseUrl}/rest/v1/${this.table}?${params}`, {
      headers: this.getHeaders(),
    });
    const body = (await res.json()) as unknown;
    if (!res.ok) {
      const err = body as { message?: string };
      return { data: null, error: { message: err.message ?? 'Query failed', status: res.status } };
    }
    return { data: body as T[], error: null };
  }

  async insert(rows: Partial<T> | Partial<T>[]): Promise<InsertResult<T>> {
    const res = await fetch(`${this.baseUrl}/rest/v1/${this.table}`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    const body = (await res.json()) as unknown;
    if (!res.ok) {
      const err = body as { message?: string };
      return { data: null, error: { message: err.message ?? 'Insert failed', status: res.status } };
    }
    return { data: Array.isArray(body) ? (body as T[]) : [body as T], error: null };
  }

  async update(patch: Partial<T>): Promise<QueryResult<T>> {
    const params = new URLSearchParams();
    for (const f of this.filters) {
      params.set(f.column, `eq.${f.value}`);
    }
    const res = await fetch(`${this.baseUrl}/rest/v1/${this.table}?${params}`, {
      method: 'PATCH',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const body = (await res.json()) as unknown;
    if (!res.ok) {
      const err = body as { message?: string };
      return { data: null, error: { message: err.message ?? 'Update failed', status: res.status } };
    }
    const rows = Array.isArray(body) ? body : [body];
    return { data: rows as T[], error: null };
  }

  async delete(): Promise<QueryResult<T>> {
    const params = new URLSearchParams();
    for (const f of this.filters) {
      params.set(f.column, `eq.${f.value}`);
    }
    const res = await fetch(`${this.baseUrl}/rest/v1/${this.table}?${params}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const body = (await res.json()) as unknown;
    if (!res.ok) {
      const err = body as { message?: string };
      return { data: null, error: { message: err.message ?? 'Delete failed', status: res.status } };
    }
    return { data: body as T[], error: null };
  }
}

export class SupaDupaBaseClient {
  private accessToken: string | null;
  private readonly anonKey?: string;

  private readonly authUrl: string;

  constructor(private readonly options: SupaDupaBaseClientOptions) {
    this.accessToken = options.accessToken ?? null;
    this.anonKey = options.anonKey;
    this.authUrl = optionsUrl(options.authUrl ?? options.url);
  }

  private baseUrl(): string {
    return optionsUrl(this.options.url);
  }

  private authBaseUrl(): string {
    return this.authUrl;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { Accept: 'application/json' };
    if (this.anonKey) h.apikey = this.anonKey;
    if (this.accessToken) h.Authorization = `Bearer ${this.accessToken}`;
    return h;
  }

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.baseUrl(), table, () => this.headers());
  }

  auth = {
    signUp: async (credentials: SignUpCredentials): Promise<{ data: AuthSession | null; error: { message: string } | null }> => {
      const res = await fetch(`${this.authBaseUrl()}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(credentials),
      });
      const body = (await res.json()) as AuthSession & { message?: string };
      if (!res.ok) return { data: null, error: { message: body.message ?? 'Sign up failed' } };
      this.accessToken = body.access_token;
      return { data: body, error: null };
    },

    signInWithPassword: async (
      credentials: SignInCredentials,
    ): Promise<{ data: AuthSession | null; error: { message: string } | null }> => {
      const res = await fetch(`${this.authBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(credentials),
      });
      const body = (await res.json()) as AuthSession & { message?: string };
      if (!res.ok) return { data: null, error: { message: body.message ?? 'Login failed' } };
      this.accessToken = body.access_token;
      return { data: body, error: null };
    },

    signOut: async (refreshToken?: string): Promise<{ error: { message: string } | null }> => {
      const res = await fetch(`${this.authBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { message?: string };
        return { error: { message: body.message ?? 'Logout failed' } };
      }
      this.accessToken = null;
      return { error: null };
    },

    getSession: async (): Promise<{ data: { user: AuthUser } | null; error: { message: string } | null }> => {
      const res = await fetch(`${this.authBaseUrl()}/auth/me`, {
        headers: this.headers(),
      });
      const body = (await res.json()) as { user?: AuthUser; message?: string };
      if (!res.ok) return { data: null, error: { message: body.message ?? 'Not authenticated' } };
      return { data: { user: body.user! }, error: null };
    },

    refreshSession: async (
      refreshToken: string,
    ): Promise<{ data: AuthSession | null; error: { message: string } | null }> => {
      const res = await fetch(`${this.authBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const body = (await res.json()) as AuthSession & { message?: string };
      if (!res.ok) return { data: null, error: { message: body.message ?? 'Refresh failed' } };
      this.accessToken = body.access_token;
      return { data: body, error: null };
    },
  };

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }
}

function optionsUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export function createClient(options: SupaDupaBaseClientOptions): SupaDupaBaseClient {
  return new SupaDupaBaseClient(options);
}

export type { SupaDupaBaseClientOptions, AuthSession, AuthUser, QueryResult, InsertResult };
