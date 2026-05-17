import { NextResponse } from 'next/server';
import { getSession, isAdmin } from '@/lib/auth';
import { db } from '@/db';
import { users, balanceTransactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, amount, description } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: 'userId dan amount wajib diisi.' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount harus lebih dari 0.' }, { status: 400 });
    }

    // Get user
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      balance: users.balance,
      accountType: users.accountType,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 });
    }

    const balanceBefore = user.balance || 0;
    const balanceAfter = balanceBefore + amount;

    // Update balance
    await db.update(users)
      .set({ balance: balanceAfter })
      .where(eq(users.id, userId));

    // Insert transaction record
    await db.insert(balanceTransactions).values({
      id: crypto.randomUUID(),
      userId,
      type: 'topup',
      amount,
      balanceBefore,
      balanceAfter,
      description: description || `Top up Rp ${amount.toLocaleString('id-ID')} oleh admin`,
      adminId: session.id,
    });

    return NextResponse.json({
      success: true,
      balanceBefore,
      balanceAfter,
      email: user.email,
    });
  } catch (error: any) {
    console.error('Admin topup error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
