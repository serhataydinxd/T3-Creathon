CREATE TYPE "public"."review_decision" AS ENUM('changes_requested', 'approved');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'ready_for_review', 'needs_manual_fix', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('content_expert', 'pedagogue', 'educator', 'manager');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('draft', 'submitted', 'changes_requested', 'approved', 'published', 'superseded');--> statement-breakpoint
CREATE TABLE "educator_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"educator_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"mode" text NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"request" jsonb NOT NULL,
	"objective_snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"stage_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"output" jsonb,
	"claimed_by" text,
	"claimed_at" timestamp with time zone,
	"lease_expires_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"canonical_text" text NOT NULL,
	"source_url" text NOT NULL,
	"content_hash" text NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objectives_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"decision" "review_decision" NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'educator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workshop_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"status" "version_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "educator_feedback" ADD CONSTRAINT "educator_feedback_version_id_workshop_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."workshop_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "educator_feedback" ADD CONSTRAINT "educator_feedback_educator_id_users_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_stages" ADD CONSTRAINT "generation_stages_run_id_generation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."generation_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_version_id_workshop_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."workshop_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD CONSTRAINT "workshop_versions_run_id_generation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."generation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD CONSTRAINT "workshop_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD CONSTRAINT "workshop_versions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "feedback_version_educator_idx" ON "educator_feedback" USING btree ("version_id","educator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_requester_idempotency_idx" ON "generation_runs" USING btree ("requested_by","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workshops_status_idx" ON "workshop_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workshops_author_idx" ON "workshop_versions" USING btree ("created_by");