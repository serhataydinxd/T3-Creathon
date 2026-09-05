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

/**
 * What a row in `objectives` is for.
 *
 * The table originally held two unrelated things: real MEB learning outcomes,
 * and synthetic `BT.*` rows standing in for published catalogue topics so a
 * proposal draft had something to reference. Those are different concepts —
 * a workshop topic is the product's identity, a curriculum outcome is an
 * optional mapping onto it — and conflating them is what let a catalogue topic
 * be persisted as though it were an approved curriculum outcome.
 *
 * Topics now live in `topics`. The legacy rows stay, marked, because existing
 * generation_runs reference them by foreign key and deleting them would break
 * packages that are already saved.
 */
export const objectiveKind = pgEnum("objective_kind", ["meb_outcome", "legacy_catalogue_topic"]);

export const objectives = pgTable("objectives", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  canonicalText: text("canonical_text").notNull(),
  sourceUrl: text("source_url").notNull(),
  contentHash: text("content_hash").notNull().unique(),
  approved: boolean("approved").notNull().default(false),
  kind: objectiveKind("kind").notNull().default("meb_outcome"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Where a topic's identity comes from. */
export const topicSource = pgEnum("topic_source", ["catalogue", "imkan"]);

/**
 * A Bilim Türkiye workshop topic: theme, cohort and title. This is the
 * product's identity, independent of any curriculum mapping.
 *
 * Most rows mirror a published catalogue entry. A few are İMKÂN-authored
 * topics the catalogue lists no counterpart for, which is why `source` exists
 * rather than being implied by a null catalogue id.
 */
export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Catalogue entry id, or `imkan:<outcomeId>` for an unlisted topic. */
  slug: text("slug").notNull().unique(),
  source: topicSource("source").notNull(),
  catalogueEntryId: text("catalogue_entry_id"),
  /** The corpus key when İMKÂN has authored a session for this topic. */
  outcomeId: text("outcome_id"),
  domainId: text("domain_id").notNull(),
  cohort: text("cohort").notNull(),
  title: text("title").notNull(),
  sourceUrl: text("source_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * An optional mapping from a workshop topic onto an official curriculum
 * outcome.
 *
 * Separate from both tables because it is a claim *about* the pair, and it
 * carries its own verification state: who checked it against the source
 * document and when. Until someone has, the interface must say no verified
 * mapping exists rather than presenting the code as official.
 */
export const topicOutcomeMappings = pgTable(
  "topic_outcome_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id").notNull().references(() => topics.id),
    objectiveId: uuid("objective_id").notNull().references(() => objectives.id),
    /**
     * Whether a human has checked this code and wording against the source
     * document. False is the honest default: a mapping transcribed from a unit
     * page is a claim awaiting verification, not an approved fact.
     */
    verified: boolean("verified").notNull().default(false),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    sourceReference: text("source_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("topic_outcome_idx").on(table.topicId, table.objectiveId)],
);

/**
 * Whether a facility or stock item is there. The third state is the reason
 * these tables exist: silence has to be storable as silence.
 */
export const facilityStatus = pgEnum("facility_status", ["available", "unavailable", "unknown"]);

/**
 * Operational centre data, as opposed to the static research transcription in
 * server/content/venues.ts.
 *
 * The static file records what Bilim Türkiye has published. These tables record
 * what people working at a centre have since established — which is a different
 * and more current thing, and the only kind of claim that may ever produce
 * `unavailable`.
 */
export const centres = pgTable("centres", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Matches the key in the static registry, so the two can be reconciled. */
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One facility at one centre, with how its status came to be known.
 *
 * Provenance is not decoration here. "The centre's page named a planetarium in
 * September" and "an educator stood in the building last week and there is no
 * dome" are both `available`/`unavailable`, and a trainer deciding whether to
 * trust it needs to know which.
 */
export const centreCapabilities = pgTable(
  "centre_capabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    centreId: uuid("centre_id").notNull().references(() => centres.id),
    capability: text("capability").notNull(),
    status: facilityStatus("status").notNull().default("unknown"),
    /** Where a published claim came from; null when a person verified it. */
    sourceUrl: text("source_url"),
    /** Who checked, when they are the authority rather than a page. */
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("centre_capability_idx").on(table.centreId, table.capability)],
);

/**
 * What a centre actually holds, and how much of it.
 *
 * Quantities are per centre rather than per session: the generator still costs
 * a session from the profile the trainer submits, and this is the standing
 * record that profile can be filled from.
 */
export const centreInventory = pgTable(
  "centre_inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    centreId: uuid("centre_id").notNull().references(() => centres.id),
    materialId: text("material_id").notNull(),
    status: facilityStatus("status").notNull().default("unknown"),
    quantity: integer("quantity"),
    unit: text("unit"),
    verifiedBy: uuid("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("centre_material_idx").on(table.centreId, table.materialId)],
);

export const generationRuns = pgTable(
  "generation_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * The workshop topic this run produced a plan for. Nullable only so runs
     * saved before topics existed still read; every new run sets it.
     */
    topicId: uuid("topic_id").references(() => topics.id),
    /**
     * Kept for the runs that predate the split, and set going forward only
     * when the topic has a curriculum mapping. Nullable now because a
     * catalogue topic legitimately has no learning outcome behind it.
     */
    objectiveId: uuid("objective_id").references(() => objectives.id),
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

/**
 * A plan the server generated, held so the draft that follows can be tied back
 * to it. The row is the only evidence that a package's prose came from the
 * model rather than from whoever posted the request, so the LIVE badge is
 * derived from here and never from the client.
 *
 * Kept in Postgres rather than in process memory because the service can run
 * more than one ECS task: generate and save are separate requests and may land
 * on different tasks, and a rolling deploy replaces tasks mid-flow.
 */
export const generationRecords = pgTable(
  "generation_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // Hash of the resource profile the plan was generated for, so a record
    // cannot be replayed against a different set of classroom conditions.
    requestHash: text("request_hash").notNull(),
    mode: text("mode").notNull(),
    // Null in replay mode; no provider was involved.
    providerModel: text("provider_model"),
    plan: jsonb("plan").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("generation_records_user_idx").on(table.userId),
    index("generation_records_expiry_idx").on(table.expiresAt),
  ],
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
