CREATE TYPE "public"."objective_kind" AS ENUM('meb_outcome', 'legacy_catalogue_topic');--> statement-breakpoint
CREATE TYPE "public"."topic_source" AS ENUM('catalogue', 'imkan');--> statement-breakpoint
CREATE TABLE "topic_outcome_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"objective_id" uuid NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"source_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"source" "topic_source" NOT NULL,
	"catalogue_entry_id" text,
	"outcome_id" text,
	"domain_id" text NOT NULL,
	"cohort" text NOT NULL,
	"title" text NOT NULL,
	"source_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "generation_runs" ALTER COLUMN "objective_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD COLUMN "topic_id" uuid;--> statement-breakpoint
ALTER TABLE "objectives" ADD COLUMN "kind" "objective_kind" DEFAULT 'meb_outcome' NOT NULL;--> statement-breakpoint
ALTER TABLE "topic_outcome_mappings" ADD CONSTRAINT "topic_outcome_mappings_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_outcome_mappings" ADD CONSTRAINT "topic_outcome_mappings_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "public"."objectives"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_outcome_mappings" ADD CONSTRAINT "topic_outcome_mappings_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topic_outcome_idx" ON "topic_outcome_mappings" USING btree ("topic_id","objective_id");--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Backfill: rows inserted by the earlier syncCatalogueTopics stood in for
-- published catalogue topics, not curriculum outcomes. They cannot be deleted
-- because saved generation_runs reference them, so they are marked instead and
-- excluded from every query that means "official learning outcome".
UPDATE "objectives" SET "kind" = 'legacy_catalogue_topic' WHERE "code" LIKE 'BT.%';
