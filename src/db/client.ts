import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/memora_test'
    : process.env.DATABASE_URL || 'postgres://localhost:5432/memora';

export const pool =
  global.__dbPool ??
  new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'test' ? 5 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };

