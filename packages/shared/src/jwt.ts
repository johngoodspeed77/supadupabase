import { createHmac, timingSafeEqual } from 'node:crypto';
import type { JwtPayload } from './types.js';

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64url');
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

function signSegment(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export interface SignJwtOptions {
  expiresInSeconds?: number;
  issuer?: string;
  audience?: string;
}

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  options: SignJwtOptions = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (options.expiresInSeconds ?? 3600);
  const full: JwtPayload = {
    ...payload,
    iat: now,
    exp,
    ...(options.issuer ? { iss: options.issuer } : {}),
    ...(options.audience ? { aud: options.audience } : {}),
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(full));
  const data = `${header}.${body}`;
  const signature = signSegment(data, secret);
  return `${data}.${signature}`;
}

export function verifyJwt(token: string, secret: string, issuer?: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const data = `${headerB64}.${payloadB64}`;
  const expected = signSegment(data, secret);

  const sigBuf = base64UrlDecode(signatureB64);
  const expBuf = base64UrlDecode(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid token signature');
  }

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8')) as { alg?: string };
  if (header.alg !== 'HS256') {
    throw new Error('Unsupported algorithm');
  }

  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error('Token expired');
  }
  if (issuer && payload.iss !== issuer) {
    throw new Error('Invalid issuer');
  }

  return payload;
}

export function hashToken(token: string): string {
  return createHmac('sha256', 'supadupabase-token-hash').update(token).digest('hex');
}
