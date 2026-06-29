import type pg from 'pg';
import { AppError } from '@supadupabase/shared';
import {
  assertAllowedTable,
  parseFilters,
  parseSelect,
  quoteIdent,
  userScopeColumn,
} from './config.js';

function applyUserScope(
  table: string,
  userId: string,
  where: string[],
  params: unknown[],
): void {
  const scopeCol = userScopeColumn(table);
  if (!scopeCol) return;
  params.push(userId);
  where.push(`${quoteIdent(scopeCol)} = $${params.length}`);
}

export async function selectRows(
  client: pg.PoolClient,
  table: string,
  query: Record<string, string>,
  userId: string,
): Promise<Record<string, unknown>[]> {
  assertAllowedTable(table);
  const columns = parseSelect(query);
  const filters = parseFilters(query);
  const limit = Math.min(Number(query.limit ?? 100), 1000);

  const selectSql =
    columns[0] === '*'
      ? '*'
      : columns.map((c) => quoteIdent(c)).join(', ');

  const where: string[] = [];
  const params: unknown[] = [];
  applyUserScope(table, userId, where, params);
  for (const f of filters) {
    params.push(f.value);
    where.push(`${quoteIdent(f.column)} = $${params.length}`);
  }

  const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT ${selectSql} FROM public.${quoteIdent(table)}${whereClause} LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await client.query<Record<string, unknown>>(sql, params);
  return result.rows;
}

export async function insertRows(
  client: pg.PoolClient,
  table: string,
  body: unknown,
  userId: string,
): Promise<Record<string, unknown>[]> {
  assertAllowedTable(table);
  const rows = Array.isArray(body) ? body : [body];
  if (!rows.length || typeof rows[0] !== 'object' || rows[0] === null) {
    throw new AppError(400, 'validation_error', 'Request body must be an object or array of objects');
  }

  const scopeCol = userScopeColumn(table);
  const inserted: Record<string, unknown>[] = [];
  for (const row of rows as Record<string, unknown>[]) {
    if (scopeCol) {
      const existing = row[scopeCol];
      if (existing != null && String(existing) !== userId) {
        throw new AppError(403, 'forbidden', 'Cannot insert row for another user');
      }
      row[scopeCol] = userId;
    }
    const keys = Object.keys(row);
    if (!keys.length) {
      throw new AppError(400, 'validation_error', 'Empty row');
    }
    const cols = keys.map(quoteIdent).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => row[k]);
    const sql = `INSERT INTO public.${quoteIdent(table)} (${cols}) VALUES (${placeholders}) RETURNING *`;
    const result = await client.query<Record<string, unknown>>(sql, values);
    inserted.push(result.rows[0]);
  }
  return inserted;
}

export async function updateRows(
  client: pg.PoolClient,
  table: string,
  body: unknown,
  query: Record<string, string>,
  userId: string,
): Promise<Record<string, unknown>[]> {
  assertAllowedTable(table);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new AppError(400, 'validation_error', 'PATCH body must be an object');
  }

  const patch = body as Record<string, unknown>;
  const scopeCol = userScopeColumn(table);
  if (scopeCol && patch[scopeCol] != null && String(patch[scopeCol]) !== userId) {
    throw new AppError(403, 'forbidden', 'Cannot change row ownership');
  }
  if (scopeCol) delete patch[scopeCol];

  const keys = Object.keys(patch);
  if (!keys.length) {
    throw new AppError(400, 'validation_error', 'No fields to update');
  }

  const filters = parseFilters(query);
  if (!filters.length) {
    throw new AppError(400, 'validation_error', 'PATCH requires at least one filter (e.g. id=eq.value)');
  }

  const params: unknown[] = [];
  const setClause = keys
    .map((k) => {
      params.push(patch[k]);
      return `${quoteIdent(k)} = $${params.length}`;
    })
    .join(', ');

  const where: string[] = [];
  applyUserScope(table, userId, where, params);
  for (const f of filters) {
    params.push(f.value);
    where.push(`${quoteIdent(f.column)} = $${params.length}`);
  }

  const sql = `UPDATE public.${quoteIdent(table)} SET ${setClause} WHERE ${where.join(' AND ')} RETURNING *`;
  const result = await client.query<Record<string, unknown>>(sql, params);
  return result.rows;
}

export async function deleteRows(
  client: pg.PoolClient,
  table: string,
  query: Record<string, string>,
  userId: string,
): Promise<Record<string, unknown>[]> {
  assertAllowedTable(table);
  const filters = parseFilters(query);
  if (!filters.length) {
    throw new AppError(400, 'validation_error', 'DELETE requires at least one filter (e.g. id=eq.value)');
  }

  const params: unknown[] = [];
  const where: string[] = [];
  applyUserScope(table, userId, where, params);
  for (const f of filters) {
    params.push(f.value);
    where.push(`${quoteIdent(f.column)} = $${params.length}`);
  }

  const sql = `DELETE FROM public.${quoteIdent(table)} WHERE ${where.join(' AND ')} RETURNING *`;
  const result = await client.query<Record<string, unknown>>(sql, params);
  return result.rows;
}
