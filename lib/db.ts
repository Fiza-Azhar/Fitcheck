import { neon } from '@neondatabase/serverless';

// Server-only: imported exclusively from app/api/**+api.ts routes and
// lib/server/*, which run in Node and are never bundled into the client. The
// raw connection string is a real database credential (unlike Supabase's anon
// key), so it must never carry an EXPO_PUBLIC_ prefix or reach the app bundle —
// every table is scoped to a user by application code (see lib/server/auth.ts),
// not by a DB-enforced policy.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Neon not configured: set DATABASE_URL in .env');
}

export const sql = neon(databaseUrl);
