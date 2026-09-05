CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" varchar(100) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_email" varchar(255),
	"ip" varchar(100),
	"status" varchar(50),
	"correlation_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"university_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255),
	"role" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"correlation_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" varchar(100) NOT NULL,
	"email" varchar(255),
	"success" boolean NOT NULL,
	"attempt_time" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"university_id" integer NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"user_name" varchar(100) DEFAULT 'Student' NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"avatar" text,
	"review_date" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"state" text NOT NULL,
	"type" text NOT NULL,
	"fee" integer NOT NULL,
	"rating" double precision NOT NULL,
	"students" text NOT NULL,
	"courses" integer NOT NULL,
	"image" text NOT NULL,
	"logo" text,
	"categories" jsonb NOT NULL,
	"stream" jsonb NOT NULL,
	"degrees" jsonb NOT NULL,
	"majors" jsonb NOT NULL,
	"popular_courses" jsonb NOT NULL,
	"phone" text NOT NULL,
	"competitive_exams" jsonb NOT NULL,
	"min_10th" integer NOT NULL,
	"min_12th" integer NOT NULL,
	"naac_grade" text NOT NULL,
	"nirf_rank" integer NOT NULL,
	"aicte_approved" boolean NOT NULL,
	"nba_accredited" boolean NOT NULL,
	"nmc_recognized" boolean NOT NULL,
	"avg_placement_lpa" double precision NOT NULL,
	"website" text,
	"virtual_tour_url" text,
	"expert_insight" text,
	"alumni_stories" jsonb,
	"campus_map" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) DEFAULT 'Student' NOT NULL,
	"name" varchar(100),
	"login_failures" integer DEFAULT 0 NOT NULL,
	"locked_until" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_uni_unique_idx" ON "bookmarks" USING btree ("user_email","university_id");--> statement-breakpoint
CREATE INDEX "chat_history_email_idx" ON "chat_history" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "reviews_university_id_idx" ON "reviews" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "reviews_user_email_idx" ON "reviews" USING btree ("user_email");