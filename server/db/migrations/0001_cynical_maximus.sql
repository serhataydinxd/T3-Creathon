CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'disabled');--> statement-breakpoint
CREATE TABLE "version_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"from_status" "version_status" NOT NULL,
	"to_status" "version_status" NOT NULL,
	"actor_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "request_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "revoked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_assigned_by" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role_assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD COLUMN "published_by" uuid;--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD COLUMN "supersedes_id" uuid;--> statement-breakpoint
ALTER TABLE "version_transitions" ADD CONSTRAINT "version_transitions_version_id_workshop_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."workshop_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_transitions" ADD CONSTRAINT "version_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transitions_version_idx" ON "version_transitions" USING btree ("version_id");--> statement-breakpoint
ALTER TABLE "workshop_versions" ADD CONSTRAINT "workshop_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_active";