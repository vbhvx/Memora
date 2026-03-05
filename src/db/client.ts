import { Pool } from 'pg';
import { Pool as NeonPool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: any;
}

const connectionString =
  process.env.NODE_ENV === 'test'
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://localhost:5432/memora_test'
    : process.env.DATABASE_URL || 'postgres://localhost:5432/memora';

const isNeon = connectionString.includes('neon.tech') || connectionString.includes('sslmode=require');

export const pool: any =
  global.__dbPool ??
  (isNeon
    ? new NeonPool({ connectionString })
    : new Pool({
        connectionString,
        max: process.env.NODE_ENV === 'test' ? 5 : 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }));

if (process.env.NODE_ENV !== 'production') {
  global.__dbPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema, isNeon };
