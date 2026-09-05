CREATE TYPE "public"."report_status" AS ENUM('draft', 'submitted', 'changes_requested', 'approved', 'published', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."report_visibility" AS ENUM('private', 'centre', 'public');--> statement-breakpoint
CREATE TYPE "public"."stage_outcome" AS ENUM('applied', 'modified', 'skipped');--> statement-breakpoint
CREATE TABLE "delivery_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"material_id" text NOT NULL,
	"planned_quantity" integer,
	"actual_quantity" integer,
	"substitute_material_id" text,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "delivery_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"centre_id" uuid,
	"educator_id" uuid NOT NULL,
	"plan_snapshot" jsonb NOT NULL,
	"delivered_on" text,
	"actual_participants" integer,
	"actual_groups" integer,
	"actual_minutes" integer,
	"actual_cost_try" integer,
	"what_worked" text,
	"what_was_hard" text,
	"accessibility_applied" text,
	"safety_observation" text,
	"incident_occurred" boolean DEFAULT false NOT NULL,
	"next_time" text,
	"visibility" "report_visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "report_status" DEFAULT 'draft' NOT NULL,
	"narrative" jsonb NOT NULL,
	"mode" text DEFAULT 'replay' NOT NULL,
	"provider_model" text,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"stage_key" text NOT NULL,
	"outcome" "stage_outcome" DEFAULT 'applied' NOT NULL,
	"note" text,
	"evidence_observed" text
);
--> statement-breakpoint
CREATE TABLE "report_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"from_status" "report_status" NOT NULL,
	"to_status" "report_status" NOT NULL,
	"actor_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "delivery_materials" ADD CONSTRAINT "delivery_materials_delivery_id_delivery_records_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_version_id_workshop_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."workshop_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_centre_id_centres_id_fk" FOREIGN KEY ("centre_id") REFERENCES "public"."centres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_educator_id_users_id_fk" FOREIGN KEY ("educator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_reports" ADD CONSTRAINT "delivery_reports_delivery_id_delivery_records_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_reports" ADD CONSTRAINT "delivery_reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_reports" ADD CONSTRAINT "delivery_reports_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_stages" ADD CONSTRAINT "delivery_stages_delivery_id_delivery_records_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_transitions" ADD CONSTRAINT "report_transitions_report_id_delivery_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."delivery_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_transitions" ADD CONSTRAINT "report_transitions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_material_idx" ON "delivery_materials" USING btree ("delivery_id","material_id");--> statement-breakpoint
CREATE INDEX "delivery_version_idx" ON "delivery_records" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_report_version_idx" ON "delivery_reports" USING btree ("delivery_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_stage_idx" ON "delivery_stages" USING btree ("delivery_id","stage_key");--> statement-breakpoint
CREATE INDEX "report_transitions_idx" ON "report_transitions" USING btree ("report_id");