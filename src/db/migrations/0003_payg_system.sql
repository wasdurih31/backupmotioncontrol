-- Migration: PAYG (Pay-As-You-Go) system + multi-provider video pool
-- Date: 2026-05

-- 1. Tambah field di table users untuk dukung 2 tipe akun
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_type" varchar(20) DEFAULT 'byok' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "balance" bigint DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "oauth_provider" varchar(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "oauth_subject" varchar(255);

-- 2. Tambah field di tasks untuk tracking biaya & sumber generate
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "cost_rupiah" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source" varchar(30);

-- 3. Tabel pool API key untuk video generation (Freepik max 100, geminigen max 2)
CREATE TABLE IF NOT EXISTS "admin_video_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" varchar(30) NOT NULL,
  "label" varchar(100),
  "api_key_encrypted" text NOT NULL,
  "status" varchar(30) DEFAULT 'active' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "last_used_at" timestamp,
  "last_error" text,
  "error_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Tabel history transaksi saldo (audit trail PAYG)
CREATE TABLE IF NOT EXISTS "balance_transactions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "public"."users"("id"),
  "type" varchar(20) NOT NULL,
  "amount" bigint NOT NULL,
  "balance_before" bigint NOT NULL,
  "balance_after" bigint NOT NULL,
  "description" text,
  "task_id" text,
  "admin_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 5. Tabel app_settings (key-value untuk konfigurasi global)
CREATE TABLE IF NOT EXISTS "app_settings" (
  "key" varchar(100) PRIMARY KEY NOT NULL,
  "value" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 6. Seed default settings (kalau belum ada)
INSERT INTO "app_settings" ("key", "value") VALUES
  ('whatsapp_admin_link', 'https://wa.me/628000000000'),
  ('byok_signup_link', 'https://nonax.site'),
  ('price_kling_std', '650'),
  ('price_kling_pro', '1000'),
  ('price_veo_720', '600'),
  ('price_veo_1080', '1000'),
  ('price_grok_720', '800'),
  ('topup_amount_1', '10000'),
  ('topup_amount_2', '25000'),
  ('topup_amount_3', '50000')
ON CONFLICT ("key") DO NOTHING;

-- 7. Migrasi user existing
UPDATE "users" SET "account_type" = 'byok' WHERE "account_type" IS NULL OR "account_type" = '';

-- 8. Index untuk query performa
CREATE INDEX IF NOT EXISTS "idx_balance_transactions_user_id" ON "balance_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_balance_transactions_created_at" ON "balance_transactions"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_admin_video_keys_provider_status" ON "admin_video_keys"("provider", "status");
CREATE INDEX IF NOT EXISTS "idx_users_oauth" ON "users"("oauth_provider", "oauth_subject");
CREATE INDEX IF NOT EXISTS "idx_users_account_type" ON "users"("account_type");
