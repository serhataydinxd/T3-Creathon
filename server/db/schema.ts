import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const runStatus = pgEnum("run_status", [
  "queued",
  "running",
  "ready_for_review",
  "needs_manual_fix",
  "failed",
]);

export const versionStatus = pgEnum("version_status", [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "published",
  "superseded",
]);

export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  canonicalText: text("canonical_text").notNull(),
  sourceUrl: text("source_url").notNull(),
  contentHash: text("content_hash").notNull().unique(),
  approved: boolean("approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    objectiveId: uuid("objective_id").notNull().references(() => objectives.id),
    requestedBy: uuid("requested_by").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    mode: text("mode").notNull(),
    status: runStatus("status").notNull().default("queued"),
    request: jsonb("request").notNull(),
    objectiveSnapshot: jsonb("objective_snapshot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("runs_requester_idempotency_idx").on(table.requestedBy, table.idempotencyKey)],
);

export const generationStages = pgTable("generation_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => generationRuns.id),
  stageKey: text("stage_key").notNull(),
  status: text("status").notNull().default("pending"),
  output: jsonb("output"),
  claimedBy: text("claimed_by"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").notNull().default(0),
});

export const workshopVersions = pgTable("workshop_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").notNull().references(() => generationRuns.id),
  status: versionStatus("status").notNull().default("draft"),
  content: jsonb("content").notNull(),
  contentHash: text("content_hash").notNull(),
  createdBy: uuid("created_by").notNull(),
  approvedBy: uuid("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
