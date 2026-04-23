import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// This is a placeholder connection string.
// During development, if POSTGRES_URL is missing, we will throw an error or handle it.
const sql = neon(process.env.POSTGRES_URL || "postgres://user:pass@localhost:5432/db");

export const db = drizzle(sql, { schema });
