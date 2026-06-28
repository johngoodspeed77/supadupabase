import pg from 'pg';

// Return DATE/TIME columns as plain strings — avoids JSON Date timezone shifts in clients.
pg.types.setTypeParser(1082, (val) => val); // DATE
pg.types.setTypeParser(1083, (val) => val); // TIME

export function createPool(connectionString?: string): pg.Pool {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  return new pg.Pool({ connectionString: url });
}

export async function withJwtContext<T>(
  pool: pg.Pool,
  userId: string | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId) {
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pg };
