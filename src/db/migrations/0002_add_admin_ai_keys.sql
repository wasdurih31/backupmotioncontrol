CREATE TABLE "admin_ai_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" varchar(50) NOT NULL,
  "api_key_encrypted" text NOT NULL,
  "label" varchar(100),
  "is_active" boolean DEFAULT true NOT NULL,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "last_used_at" timestamp,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
