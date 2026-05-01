CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"freepik_task_id" text,
	"status" varchar(20) NOT NULL,
	"prompt" text,
	"character_orientation" varchar(20),
	"cfg_scale" integer,
	"video_url" text,
	"image_url" text,
	"result_url" text,
	"engine" varchar(50) DEFAULT 'kling',
	"model" varchar(50) DEFAULT 'motion_control_std',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tutorials" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255),
	"content" text,
	"media_url" text,
	"media_type" varchar(20),
	"link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tutorials_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"access_code" varchar(50),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"api_key" text,
	"total_generate" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"is_active" boolean DEFAULT true,
	"subscription_start" timestamp,
	"subscription_end" timestamp
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;