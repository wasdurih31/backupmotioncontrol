import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, tutorials } from '@/db/schema';
import { isAdmin } from '@/lib/auth';
import { eq, or } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await request.json();

    // Support format v2 (object with users + tutorials) dan format lama (array of users).
    let usersData: any[] = [];
    let tutorialsData: any[] = [];

    if (Array.isArray(data)) {
      // Format lama: array langsung = users saja.
      usersData = data;
    } else if (data && typeof data === 'object') {
      usersData = Array.isArray(data.users) ? data.users : [];
      tutorialsData = Array.isArray(data.tutorials) ? data.tutorials : [];
    } else {
      return NextResponse.json({ error: 'Format data tidak valid.' }, { status: 400 });
    }

    // ── Import Users ──
    let usersImported = 0;
    let usersSkipped = 0;
    let usersUpdated = 0;

    for (const userData of usersData) {
      // Cari user yang sudah ada berdasarkan email, phone, atau accessCode.
      const conditions = [];
      if (userData.email) conditions.push(eq(users.email, userData.email));
      if (userData.phone) conditions.push(eq(users.phone, userData.phone));
      if (userData.accessCode) conditions.push(eq(users.accessCode, userData.accessCode));

      let existingUser: any = null;
      if (conditions.length > 0) {
        const found = await db.select().from(users).where(or(...conditions)).limit(1);
        if (found.length > 0) existingUser = found[0];
      }

      // Siapkan data insert/update.
      const record: Record<string, any> = {
        email: userData.email || null,
        phone: userData.phone || null,
        accessCode: userData.accessCode || null,
        role: userData.role || 'user',
        apiKey: userData.apiKey || null,
        totalGenerate: userData.totalGenerate || 0,
        isActive: userData.isActive !== undefined ? userData.isActive : true,
      };

      // Tanggal-tanggal penting (subscription, login, created).
      if (userData.createdAt) record.createdAt = new Date(userData.createdAt);
      if (userData.lastLoginAt) record.lastLoginAt = new Date(userData.lastLoginAt);
      if (userData.subscriptionStart) record.subscriptionStart = new Date(userData.subscriptionStart);
      if (userData.subscriptionEnd) record.subscriptionEnd = new Date(userData.subscriptionEnd);

      if (existingUser) {
        // Update user yang sudah ada — sinkronkan semua field termasuk subscription.
        await db.update(users).set(record).where(eq(users.id, existingUser.id));
        usersUpdated++;
      } else {
        // Insert user baru. Pakai id dari backup jika ada, atau generate baru.
        const userId = userData.id || crypto.randomUUID();
        await db.insert(users).values({ id: userId, ...record });
        usersImported++;
      }
    }

    // ── Import Tutorials ──
    let tutorialsImported = 0;
    let tutorialsSkipped = 0;
    let tutorialsUpdated = 0;

    for (const tutData of tutorialsData) {
      if (!tutData.title) {
        tutorialsSkipped++;
        continue;
      }

      // Cari tutorial yang sudah ada berdasarkan slug atau id.
      let existingTut: any = null;
      if (tutData.slug) {
        const found = await db.select().from(tutorials).where(eq(tutorials.slug, tutData.slug)).limit(1);
        if (found.length > 0) existingTut = found[0];
      }
      if (!existingTut && tutData.id) {
        const found = await db.select().from(tutorials).where(eq(tutorials.id, tutData.id)).limit(1);
        if (found.length > 0) existingTut = found[0];
      }

      const record = {
        title: tutData.title as string,
        slug: (tutData.slug || null) as string | null,
        content: (tutData.content || null) as string | null,
        mediaUrl: (tutData.mediaUrl || null) as string | null,
        mediaType: (tutData.mediaType || null) as string | null,
        link: (tutData.link || null) as string | null,
        createdAt: tutData.createdAt ? new Date(tutData.createdAt) : new Date(),
        updatedAt: tutData.updatedAt ? new Date(tutData.updatedAt) : new Date(),
      };

      if (existingTut) {
        await db.update(tutorials).set(record).where(eq(tutorials.id, existingTut.id));
        tutorialsUpdated++;
      } else {
        const tutId = (tutData.id || crypto.randomUUID()) as string;
        await db.insert(tutorials).values({ id: tutId, ...record });
        tutorialsImported++;
      }
    }

    const summary = [
      `Users — Baru: ${usersImported}, Diperbarui: ${usersUpdated}, Dilewati: ${usersSkipped}`,
      `Tutorials — Baru: ${tutorialsImported}, Diperbarui: ${tutorialsUpdated}, Dilewati: ${tutorialsSkipped}`,
    ].join('. ');

    return NextResponse.json({ success: true, message: `Import selesai. ${summary}` });
  } catch (error: any) {
    console.error('Backup import error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import data' }, { status: 500 });
  }
}
