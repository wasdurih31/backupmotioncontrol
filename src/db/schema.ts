import { pgTable, text, integer, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  accessCode: varchar('access_code', { length: 50 }),
  role: varchar('role', { length: 20 }).notNull().default('user'), // 'admin' or 'user'
  apiKey: text('api_key'), // Encrypted FreePik API Key
  totalGenerate: integer('total_generate').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
  isActive: boolean('is_active').default(true),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  freepikTaskId: text('freepik_task_id'),
  status: varchar('status', { length: 20 }).notNull(), // 'queued', 'processing', 'success', 'failed'
  prompt: text('prompt'),
  characterOrientation: varchar('character_orientation', { length: 20 }), // 'video', 'image'
  cfgScale: integer('cfg_scale'), // Actually numeric but we can store as decimal/int or string for simplicity
  videoUrl: text('video_url'), // Original motion video from Blob
  imageUrl: text('image_url'), // Character image from Blob
  resultUrl: text('result_url'), // Result video
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});
