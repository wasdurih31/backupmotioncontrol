require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.POSTGRES_URL);

async function migrate() {
  try {
    await sql`ALTER TABLE tutorials ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'all'`;
    console.log('Migration OK: visibility column added');
  } catch (e) {
    console.error('Error:', e.message);
  }
}

migrate();
