import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export async function GET(request: Request) {
  // Simple auth check via URL param for safety (manual trigger)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== 'sync-2026-universe') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const csvPath = path.join(process.cwd(), 'users.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ error: 'users.csv not found in root directory' }, { status: 404 });
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true,
      relax_column_count: true
    });

    let updatedCount = 0;
    let insertedCount = 0;

    for (const record of records) {
      const email = record.email?.toLowerCase().trim() || null;
      const phone = record.phone?.trim() || null;
      const code = record.code?.trim();
      
      // Handle date parsing safely
      const expiredAt = record.expired_at && record.expired_at !== "" ? new Date(record.expired_at) : null;
      const createdAt = record.created_at && record.created_at !== "" ? new Date(record.created_at) : new Date();

      if (!code) continue; // Skip if no code

      // Try to find user by email or phone
      let existingUser = null;
      
      if (email) {
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (result.length > 0) existingUser = result[0];
      }
      
      if (!existingUser && phone) {
        const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
        if (result.length > 0) existingUser = result[0];
      }

      if (existingUser) {
        // Update existing user
        await db.update(users)
          .set({
            accessCode: code,
            subscriptionStart: existingUser.subscriptionStart || createdAt,
            subscriptionEnd: expiredAt,
            // Optionally update usage if CSV has newer data
            totalGenerate: Math.max(existingUser.totalGenerate || 0, parseInt(record.total_videos_created) || 0)
          })
          .where(eq(users.id, existingUser.id));
        updatedCount++;
      } else {
        // Insert new user
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
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed. ${updatedCount} users updated, ${insertedCount} users created.`,
    });

  } catch (error: any) {
    console.error('CSV Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
