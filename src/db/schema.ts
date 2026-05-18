import { pgTable, text, integer, timestamp, varchar, boolean, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  accessCode: varchar('access_code', { length: 50 }),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' or 'user'
  // Tipe akun:
  //   'byok' = user pakai API key sendiri (Freepik), login pakai access code, langganan bulanan
  //   'payg' = pay-as-you-go, login pakai Google OAuth, isi saldo, dipotong per generate
  accountType: varchar('account_type', { length: 20 }).notNull().default('byok'),
  // Saldo dalam rupiah (integer untuk hindari floating point issue).
  // Hanya digunakan untuk akun PAYG. BYOK selalu 0.
  balance: bigint('balance', { mode: 'number' }).default(0).notNull(),
  // Provider OAuth (untuk PAYG): 'google'.
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthSubject: varchar('oauth_subject', { length: 255 }), // Google user ID (sub)
  apiKey: text('api_key'), // Encrypted FreePik API Key (BYOK only)
  totalGenerate: integer('total_generate').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
  isActive: boolean('is_active').default(true),
  subscriptionStart: timestamp('subscription_start'),
  subscriptionEnd: timestamp('subscription_end'),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  freepikTaskId: text('freepik_task_id'),
  status: varchar('status', { length: 20 }).notNull(), // 'queued', 'processing', 'success', 'failed', 'expired'
  prompt: text('prompt'),
  characterOrientation: varchar('character_orientation', { length: 20 }),
  cfgScale: integer('cfg_scale'),
  videoUrl: text('video_url'),
  imageUrl: text('image_url'),
  resultUrl: text('result_url'),
  engine: varchar('engine', { length: 50 }).default('kling'),
  model: varchar('model', { length: 50 }).default('motion_control_std'),
  // Tracking biaya (PAYG only). 0 untuk BYOK.
  costRupiah: integer('cost_rupiah').default(0).notNull(),
  // Sumber generate: 'byok_user_key' | 'payg_freepik_pool' | 'payg_geminigen_pool'
  source: varchar('source', { length: 30 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

export const tutorials = pgTable('tutorials', {
  id: text('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique(),
  content: text('content'),
  mediaUrl: text('media_url'),
  mediaType: varchar('media_type', { length: 20 }),
  link: text('link'),
  // Visibility: 'all' (semua user), 'byok' (hanya BYOK), 'payg' (hanya PAYG)
  visibility: varchar('visibility', { length: 20 }).notNull().default('all'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userAiSettings = pgTable('user_ai_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  provider: varchar('provider', { length: 50 }).notNull().default('google'),
  apiKeyEncrypted: text('api_key_encrypted'),
  selectedModel: varchar('selected_model', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminAiKeys = pgTable('admin_ai_keys', {
  id: text('id').primaryKey(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'openrouter' | 'groq'
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  label: varchar('label', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Pool API key untuk PAYG generate (admin-managed) ────────────────
// Provider: 'freepik' (max 100 keys) | 'geminigen' (max 2 keys)
// Status: 'active' | 'limit_reached' | 'error' | 'disabled'
// Sticky failover: pakai key paling lama dipakai dengan status='active',
// kalau gagal langsung mark status & TIDAK dipakai lagi (tidak ada auto-reset).
export const adminVideoKeys = pgTable('admin_video_keys', {
  id: text('id').primaryKey(),
  provider: varchar('provider', { length: 30 }).notNull(),
  label: varchar('label', { length: 100 }),
  apiKeyEncrypted: text('api_key_encrypted').notNull(),
  // Status terstruktur untuk monitoring & failover
  status: varchar('status', { length: 30 }).default('active').notNull(),
  isActive: boolean('is_active').default(true).notNull(), // admin manual toggle
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  lastError: text('last_error'),
  errorCount: integer('error_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── History transaksi saldo (audit trail untuk PAYG) ────────────────
// Type: 'topup' (admin add) | 'usage' (deduct on generate) | 'refund' (return on failure) | 'admin_adjust'
export const balanceTransactions = pgTable('balance_transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(), // positif = nambah, negatif = potong
  balanceBefore: bigint('balance_before', { mode: 'number' }).notNull(),
  balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
  description: text('description'),
  taskId: text('task_id'), // referensi task kalau type usage/refund
  adminId: text('admin_id'), // siapa admin yang lakukan kalau topup/admin_adjust
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── App settings (key-value untuk konfigurasi global) ───────────────
// Contoh keys:
//   'whatsapp_admin_link' = 'https://wa.me/628xxx'
//   'byok_signup_link'    = 'https://...'
//   'price_kling_std'     = '650'
//   'price_kling_pro'     = '1000'
//   'price_veo_720'       = '600'
//   'price_veo_1080'      = '1000'
//   'price_grok_720'      = '800'
//   'topup_amount_1'      = '10000'
//   'topup_amount_2'      = '25000'
//   'topup_amount_3'      = '50000'
export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Proxy accounts for routing API calls through residential proxies ─
// Format: protocol://username:password@host:port
// Used for Freepik API calls to avoid IP blocks.
// Sticky mode: each proxy is "locked" to a session for ~30 min.
export const proxyAccounts = pgTable('proxy_accounts', {
  id: text('id').primaryKey(),
  // Full proxy URL: http://user:pass@geo.iproyal.com:12321
  proxyUrl: text('proxy_url').notNull(),
  label: varchar('label', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
