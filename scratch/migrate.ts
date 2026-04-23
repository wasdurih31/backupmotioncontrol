import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import { users } from '../src/db/schema';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load env explicitly
dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
});

async function runMigration() {
  console.log("Starting user data migration...");
  await client.connect();
  const dbLocal = drizzle(client);
  try {
    const rawData = fs.readFileSync('users_data.json', 'utf-8');
    const { data } = JSON.parse(rawData);
    
    if (!data || !Array.isArray(data)) {
      throw new Error("Invalid format in users_data.json");
    }

    console.log(`Found ${data.length} users to migrate.`);
    
    // Prepare the insert objects
    const newUsers = data.map((user: any) => ({
      id: `USR-${uuidv4().substring(0, 8).toUpperCase()}`,
      email: user.email || null,
      phone: user.phone || null,
      accessCode: user.accessCode,
      role: 'user',
      totalGenerate: 0,
      isActive: true,
    }));

    // Insert in batches of 50 to avoid payload limit
    const BATCH_SIZE = 50;
    for (let i = 0; i < newUsers.length; i += BATCH_SIZE) {
      const batch = newUsers.slice(i, i + BATCH_SIZE);
      await dbLocal.insert(users).values(batch);
      console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
    }
    
    console.log("✅ Migration completed successfully!");
    console.log(`Inserted ${newUsers.length} rows.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
