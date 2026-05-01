import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { isAdmin } from '@/lib/auth';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data format. Expected an array of users.' }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const userData of data) {
      // Check if user already exists based on email or phone
      const conditions = [];
      if (userData.email) conditions.push(eq(users.email, userData.email));
      if (userData.phone) conditions.push(eq(users.phone, userData.phone));
      if (userData.accessCode) conditions.push(eq(users.accessCode, userData.accessCode));

      if (conditions.length > 0) {
        const existing = await db.select().from(users).where(or(...conditions)).limit(1);
        if (existing.length > 0) {
          skippedCount++;
          continue; // Skip if already exists
        }
      }

      // Prepare user data
      const newUserId = crypto.randomUUID();
      const insertData: any = {
        id: newUserId,
        email: userData.email || null,
        phone: userData.phone || null,
        accessCode: userData.accessCode || null,
        role: userData.role || 'user',
        apiKey: userData.apiKey || null,
        totalGenerate: userData.totalGenerate || 0,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
      };

      // Handle dates specifically
      if (userData.createdAt) insertData.createdAt = new Date(userData.createdAt);
      if (userData.lastLoginAt) insertData.lastLoginAt = new Date(userData.lastLoginAt);
      if (userData.subscriptionStart) insertData.subscriptionStart = new Date(userData.subscriptionStart);
      if (userData.subscriptionEnd) insertData.subscriptionEnd = new Date(userData.subscriptionEnd);

      await db.insert(users).values(insertData);
      importedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import completed. Imported: ${importedCount}, Skipped: ${skippedCount}`
    });

  } catch (error: any) {
    console.error('Backup import error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import users' }, { status: 500 });
  }
}
