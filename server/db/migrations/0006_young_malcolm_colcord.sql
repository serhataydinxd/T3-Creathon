CREATE TABLE "adaptation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"library_entry_id" uuid NOT NULL,
	"source_version_id" uuid NOT NULL,
	"target_version_id" uuid,
	"target_centre_id" uuid,
	"adapted_by" uuid NOT NULL,
	"compatibility" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"topic_id" uuid,
	"title" text NOT NULL,
	"domain_id" text NOT NULL,
	"cohort" text NOT NULL,
	"format_id" text NOT NULL,
	"centre_name" text,
	"centre_location" text,
	"delivered_on" text,
	"actual_minutes" integer,
	"actual_participants" integer,
	"actual_cost_try" integer,
	"requires_internet" boolean DEFAULT false NOT NULL,
	"requires_electricity" boolean DEFAULT false NOT NULL,
	"required_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"accessibility_features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rating" integer,
	"adaptation_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adaptation_records" ADD CONSTRAINT "adaptation_records_library_entry_id_library_entries_id_fk" FOREIGN KEY ("library_entry_id") REFERENCES "public"."library_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptation_records" ADD CONSTRAINT "adaptation_records_source_version_id_workshop_versions_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."workshop_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptation_records" ADD CONSTRAINT "adaptation_records_target_version_id_workshop_versions_id_fk" FOREIGN KEY ("target_version_id") REFERENCES "public"."workshop_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptation_records" ADD CONSTRAINT "adaptation_records_target_centre_id_centres_id_fk" FOREIGN KEY ("target_centre_id") REFERENCES "public"."centres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptation_records" ADD CONSTRAINT "adaptation_records_adapted_by_users_id_fk" FOREIGN KEY ("adapted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_delivery_id_delivery_records_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."delivery_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_report_id_delivery_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."delivery_reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adaptation_entry_idx" ON "adaptation_records" USING btree ("library_entry_id");--> statement-breakpoint
CREATE UNIQUE INDEX "library_delivery_idx" ON "library_entries" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "library_domain_idx" ON "library_entries" USING btree ("domain_id");--> statement-breakpoint
CREATE INDEX "library_published_idx" ON "library_entries" USING btree ("published_at");