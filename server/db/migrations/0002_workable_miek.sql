CREATE TABLE "generation_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"mode" text NOT NULL,
	"provider_model" text,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_records" ADD CONSTRAINT "generation_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_records_user_idx" ON "generation_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generation_records_expiry_idx" ON "generation_records" USING btree ("expires_at");