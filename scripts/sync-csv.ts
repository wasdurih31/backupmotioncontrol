import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function run() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('POSTGRES_URL not found');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  const csvPath = path.join(process.cwd(), 'users.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('users.csv not found');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, { 
    columns: true, 
    skip_empty_lines: true,
    relax_column_count: true
  }) as any[];

  console.log(`Processing ${records.length} records...`);

  let updatedCount = 0;
  let insertedCount = 0;

  for (const record of records) {
    const email = record.email?.toLowerCase().trim() || null;
    const phone = record.phone?.trim() || null;
    const code = record.code?.trim();
    
    const expiredAt = record.expired_at && record.expired_at !== "" ? new Date(record.expired_at) : null;
    const createdAt = record.created_at && record.created_at !== "" ? new Date(record.created_at) : new Date();

    if (!code) continue;

    let existingUser = null;
    
    if (email) {
      const res = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (res.length > 0) existingUser = res[0];
    }
    
    if (!existingUser && phone) {
      const res = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
      if (res.length > 0) existingUser = res[0];
    }

    if (existingUser) {
      await db.update(users)
        .set({
          accessCode: code,
          subscriptionEnd: expiredAt,
          totalGenerate: Math.max(existingUser.totalGenerate || 0, parseInt(record.total_videos_created) || 0)
        })
        .where(eq(users.id, existingUser.id));
      updatedCount++;
    } else {
      await db.insert(users).values({
        id: `USR-${uuidv4().substring(0, 8).toUpperCase()}`,
        email,
        phone,
        accessCode: code,
        role: 'user',
        isActive: true,
        subscriptionStart: createdAt,
        subscriptionEnd: expiredAt,
        totalGenerate: parseInt(record.total_videos_created) || 0,
        createdAt: createdAt
      });
      insertedCount++;
    }
    
    if ((updatedCount + insertedCount) % 50 === 0) {
      console.log(`Progress: ${updatedCount + insertedCount}/${records.length}`);
    }
  }

  console.log(`Done! Updated: ${updatedCount}, Inserted: ${insertedCount}`);
  process.exit(0);
}

run().catch(console.error);
