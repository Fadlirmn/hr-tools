import { Pool, type QueryResultRow } from 'pg'

const globalForDb = global as unknown as { pgPool?: Pool }

export const pool =
  globalForDb.pgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.pgPool = pool

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params)
}
