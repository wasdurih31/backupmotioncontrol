require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function migrate() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS proxy_accounts (
        id TEXT PRIMARY KEY,
        proxy_url TEXT NOT NULL,
        label VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        usage_count INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP,
        last_error TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    console.log('Migration OK: proxy_accounts table created');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

migrate();
