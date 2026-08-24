import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", [
  "content_expert",
  "pedagogue",
  "educator",
  "manager",
]);

export const userStatus = pgEnum("user_status", ["pending", "active", "disabled"]);

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

export const reviewDecision = pgEnum("review_decision", ["changes_requested", "approved"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRole("role"),
  status: userStatus("status").notNull().default("pending"),
  roleAssignedBy: uuid("role_assigned_by"),
  roleAssignedAt: timestamp("role_assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_idx").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

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
    requestedBy: uuid("requested_by").notNull().references(() => users.id),
    idempotencyKey: text("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
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
  runId: uuid("run_id").notNull().references(() => generationRuns.id, { onDelete: "cascade" }),
  stageKey: text("stage_key").notNull(),
  status: text("status").notNull().default("pending"),
  output: jsonb("output"),
  claimedBy: text("claimed_by"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  attemptCount: integer("attempt_count").notNull().default(0),
});

export const workshopVersions = pgTable(
  "workshop_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").notNull().references(() => generationRuns.id),
    status: versionStatus("status").notNull().default("draft"),
    title: text("title").notNull(),
    content: jsonb("content").notNull(),
    contentHash: text("content_hash").notNull(),
    version: integer("version").notNull().default(1),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    supersedesId: uuid("supersedes_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("workshops_status_idx").on(table.status), index("workshops_author_idx").on(table.createdBy)],
);

export const versionTransitions = pgTable(
  "version_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id").notNull().references(() => workshopVersions.id, { onDelete: "cascade" }),
    fromStatus: versionStatus("from_status").notNull(),
    toStatus: versionStatus("to_status").notNull(),
    actorId: uuid("actor_id").notNull().references(() => users.id),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("transitions_version_idx").on(table.versionId)],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  versionId: uuid("version_id").notNull().references(() => workshopVersions.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").notNull().references(() => users.id),
  decision: reviewDecision("decision").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const educatorFeedback = pgTable(
  "educator_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id").notNull().references(() => workshopVersions.id, { onDelete: "cascade" }),
    educatorId: uuid("educator_id").notNull().references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("feedback_version_educator_idx").on(table.versionId, table.educatorId)],
);
