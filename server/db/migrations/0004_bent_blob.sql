CREATE TYPE "public"."facility_status" AS ENUM('available', 'unavailable', 'unknown');--> statement-breakpoint
CREATE TABLE "centre_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"centre_id" uuid NOT NULL,
	"capability" text NOT NULL,
	"status" "facility_status" DEFAULT 'unknown' NOT NULL,
	"source_url" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "centre_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"centre_id" uuid NOT NULL,
	"material_id" text NOT NULL,
	"status" "facility_status" DEFAULT 'unknown' NOT NULL,
	"quantity" integer,
	"unit" text,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "centres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "centres_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "centre_capabilities" ADD CONSTRAINT "centre_capabilities_centre_id_centres_id_fk" FOREIGN KEY ("centre_id") REFERENCES "public"."centres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centre_capabilities" ADD CONSTRAINT "centre_capabilities_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centre_inventory" ADD CONSTRAINT "centre_inventory_centre_id_centres_id_fk" FOREIGN KEY ("centre_id") REFERENCES "public"."centres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "centre_inventory" ADD CONSTRAINT "centre_inventory_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "centre_capability_idx" ON "centre_capabilities" USING btree ("centre_id","capability");--> statement-breakpoint
CREATE UNIQUE INDEX "centre_material_idx" ON "centre_inventory" USING btree ("centre_id","material_id");