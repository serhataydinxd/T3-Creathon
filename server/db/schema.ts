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

/**
 * The report lifecycle, mirroring the workshop one so the two read alike.
 *
 * `published` here means visible in the Etkinlik Kütüphanesi, which is a
 * separate decision from the pedagogue's approval — approving a report says it
 * is accurate, publishing it says it may be shared.
 */
export const reportStatus = pgEnum("report_status", [
  "draft",
  "submitted",
  "changes_requested",
  "approved",
  "published",
  "superseded",
]);

/** Who may see a delivery report once it is approved. */
export const reportVisibility = pgEnum("report_visibility", ["private", "centre", "public"]);

/** What became of a planned stage when the session actually ran. */
export const stageOutcome = pgEnum("stage_outcome", ["applied", "modified", "skipped"]);

/**
 * One actual delivery of a published workshop.
 *
 * `planSnapshot` is the whole point: an immutable copy of the published
 * version taken when the delivery starts. The source workshop can be revised
 * afterwards — that is what versions are for — and a report describing what
 * was actually delivered must not silently change underneath the person who
 * wrote it.
 *
 * Planned figures live in the snapshot and actual ones in their own columns,
 * side by side and never overwriting each other, because the comparison is the
 * substance of the report.
 */
export const deliveryRecords = pgTable(
  "delivery_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id").notNull().references(() => workshopVersions.id),
    centreId: uuid("centre_id").references(() => centres.id),
    educatorId: uuid("educator_id").notNull().references(() => users.id),
    planSnapshot: jsonb("plan_snapshot").notNull(),
    deliveredOn: text("delivered_on"),
    actualParticipants: integer("actual_participants"),
    actualGroups: integer("actual_groups"),
    actualMinutes: integer("actual_minutes"),
    actualCostTry: integer("actual_cost_try"),
    whatWorked: text("what_worked"),
    whatWasHard: text("what_was_hard"),
    accessibilityApplied: text("accessibility_applied"),
    /**
     * Safety observations stay on the record and are never copied into a
     * public library entry automatically: an incident is operational
     * information for the centre, not promotional material.
     */
    safetyObservation: text("safety_observation"),
    incidentOccurred: boolean("incident_occurred").notNull().default(false),
    nextTime: text("next_time"),
    visibility: reportVisibility("visibility").notNull().default("private"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("delivery_version_idx").on(table.versionId)],
);

/** What happened to each planned 5E stage, with the educator's reason. */
export const deliveryStages = pgTable(
  "delivery_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id").notNull().references(() => deliveryRecords.id, { onDelete: "cascade" }),
    stageKey: text("stage_key").notNull(),
    outcome: stageOutcome("outcome").notNull().default("applied"),
    /** Why it was changed or skipped. Required by the domain for both. */
    note: text("note"),
    /** What the educator actually observed, as opposed to what was expected. */
    evidenceObserved: text("evidence_observed"),
  },
  (table) => [uniqueIndex("delivery_stage_idx").on(table.deliveryId, table.stageKey)],
);

/** Materials as actually used, beside what the plan asked for. */
export const deliveryMaterials = pgTable(
  "delivery_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id").notNull().references(() => deliveryRecords.id, { onDelete: "cascade" }),
    materialId: text("material_id").notNull(),
    plannedQuantity: integer("planned_quantity"),
    actualQuantity: integer("actual_quantity"),
    /** A different material used in its place, when one was. */
    substituteMaterialId: text("substitute_material_id"),
    note: text("note"),
  },
  (table) => [uniqueIndex("delivery_material_idx").on(table.deliveryId, table.materialId)],
);

/**
 * A version of the report narrative for one delivery.
 *
 * Immutable, like a workshop version: an approved report is superseded by a
 * new version rather than edited, so what a pedagogue approved stays readable
 * exactly as they approved it.
 */
export const deliveryReports = pgTable(
  "delivery_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id").notNull().references(() => deliveryRecords.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    status: reportStatus("status").notNull().default("draft"),
    /** The narrative sections, authored by the model or edited by a person. */
    narrative: jsonb("narrative").notNull(),
    /** Which produced this text, so provenance survives an edit. */
    mode: text("mode").notNull().default("replay"),
    providerModel: text("provider_model"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("delivery_report_version_idx").on(table.deliveryId, table.version)],
);

export const reportTransitions = pgTable(
  "report_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id").notNull().references(() => deliveryReports.id, { onDelete: "cascade" }),
    fromStatus: reportStatus("from_status").notNull(),
    toStatus: reportStatus("to_status").notNull(),
    actorId: uuid("actor_id").notNull().references(() => users.id),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("report_transitions_idx").on(table.reportId)],
);

/**
 * A delivery report that has been published for others to find and reuse.
 *
 * Denormalised on purpose. Every field the library filters on — theme, cohort,
 * duration, budget, what the room needs — would otherwise mean digging through
 * a jsonb plan snapshot on every query, and the filters are the whole point of
 * the screen. The row is written once, when a manager publishes.
 *
 * What is deliberately absent matters as much: no safety observation, no
 * incident detail, no free-text accessibility note, no educator name. Those
 * are operational facts for the centre that ran the session, and a library
 * entry is a public document.
 */
export const libraryEntries = pgTable(
  "library_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deliveryId: uuid("delivery_id").notNull().references(() => deliveryRecords.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").notNull().references(() => deliveryReports.id),
    topicId: uuid("topic_id").references(() => topics.id),
    title: text("title").notNull(),
    domainId: text("domain_id").notNull(),
    cohort: text("cohort").notNull(),
    formatId: text("format_id").notNull(),
    centreName: text("centre_name"),
    centreLocation: text("centre_location"),
    deliveredOn: text("delivered_on"),
    actualMinutes: integer("actual_minutes"),
    actualParticipants: integer("actual_participants"),
    actualCostTry: integer("actual_cost_try"),
    requiresInternet: boolean("requires_internet").notNull().default(false),
    requiresElectricity: boolean("requires_electricity").notNull().default(false),
    /** Capability ids the delivered route needed, as a comma-free json array. */
    requiredCapabilities: jsonb("required_capabilities").notNull().default([]),
    /**
     * Categorical accessibility provisions from the plan profile — never the
     * educator's free-text note, which can describe an individual child.
     */
    accessibilityFeatures: jsonb("accessibility_features").notNull().default([]),
    keyMaterials: jsonb("key_materials").notNull().default([]),
    /** Average educator rating of the source workshop, when there is one. */
    rating: integer("rating"),
    adaptationCount: integer("adaptation_count").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("library_delivery_idx").on(table.deliveryId),
    index("library_domain_idx").on(table.domainId),
    index("library_published_idx").on(table.publishedAt),
  ],
);

/**
 * A workshop draft started from a library entry, for another centre.
 *
 * Written by the adapt-to-my-centre flow. The source version, report and
 * centre are recorded so provenance survives, and the source is never
 * modified — an adaptation is a new draft, not an edit.
 */
export const adaptationRecords = pgTable(
  "adaptation_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    libraryEntryId: uuid("library_entry_id").notNull().references(() => libraryEntries.id, { onDelete: "cascade" }),
    sourceVersionId: uuid("source_version_id").notNull().references(() => workshopVersions.id),
    targetVersionId: uuid("target_version_id").references(() => workshopVersions.id),
    targetCentreId: uuid("target_centre_id").references(() => centres.id),
    adaptedBy: uuid("adapted_by").notNull().references(() => users.id),
    /** What differed and why, computed rather than typed. */
    compatibility: jsonb("compatibility").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("adaptation_entry_idx").on(table.libraryEntryId)],
);
