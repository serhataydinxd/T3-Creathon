import type { MaterialId } from "@/server/content/materials";
import type { RouteCandidate } from "./candidates";

/**
 * Kept as an alias so the registry stays the one place materials are declared.
 * Adding a material to the catalogue widens this automatically.
 */
export type MaterialKey = MaterialId;

export type ResourceProfile = {
  durationMinutes: 40 | 60 | 80;
  classSize: number;
  groupSize: number;
  budgetTry: number;
  hardBudget: boolean;
  hasInternet: boolean;
  hasElectricity: boolean;
  materials: MaterialKey[];
  accessibilityNeeds: string[];
  /**
   * Which approved outcome the workshop targets. Optional in the type because
   * plans and generation records created before the corpus existed carry none;
   * the request schema fills it with the default.
   */
  outcomeId?: string;
  /**
   * Fixed facilities verified as present at the venue. Optional in the type
   * because profiles captured before venues were modelled carry none; the
   * request schema defaults it so generate and save always hash identically.
   */
  capabilities?: string[];
  /**
   * Facilities verified as *absent* by someone who checked.
   *
   * Separate from `capabilities` rather than folded into a status map so an
   * older profile keeps parsing unchanged — and, more importantly, so it keeps
   * meaning what it meant. A facility in neither list is `unknown`, which is
   * the honest reading of a profile captured before anyone could say.
   */
  unavailableCapabilities?: string[];
  /** Which Bilim Türkiye education format the session is delivered under. */
  formatId?: string;
  /**
   * Minutes the trainer has before the session to set up.
   *
   * Not part of the session's own duration — the 5E allocation is unchanged by
   * it — but a route needing an hour of preparation is a different proposition
   * from one needing five minutes, and nothing recorded that before.
   */
  prepMinutes?: number;
  /**
   * What the trainer expects to see as evidence of learning.
   *
   * Collected before generation so the model writes towards a stated goal
   * rather than inventing one, and so a reviewer can check the session against
   * what was actually asked for.
   */
  expectedEvidence?: string;
  /**
   * How many of each material the venue actually holds.
   *
   * Separate from `materials`, which records only whether an item is available
   * at all. A classroom with four pairs of scissors and six groups can run the
   * session; one with four pairs and twelve groups cannot, and that was
   * invisible while stock was a boolean.
   */
  materialStock?: Record<string, number>;
  /**
   * A published catalogue topic İMKÂN has no authored session for, chosen so
   * the assistant can draft one. Mutually exclusive with a meaningful
   * outcomeId: when this is set the plan is a proposal awaiting pedagogue
   * review, not an adaptation of approved content.
   */
  proposalEntryId?: string;
};

/** Why a route the classroom could not support was set aside. */
export type RouteRejection = {
  routeId: string;
  routeName: string;
  code: "NO_ELECTRICITY" | "NO_INTERNET" | "MISSING_MATERIALS" | "MISSING_CAPABILITY" | "NOT_IN_FORMAT";
  reason: string;
};

/**
 * A route that is not ruled out, but cannot be confirmed either.
 *
 * The distinction this carries is the whole reason for the three-state model:
 * "this centre has no dome" and "nobody has recorded whether this centre has a
 * dome" are different facts, and only the first justifies discarding a route.
 * An uncertain route is reported with what would have to be checked to settle
 * it, so the missing information is actionable rather than invisible.
 */
export type RouteUncertainty = {
  routeId: string;
  routeName: string;
  code: "CAPABILITY_UNKNOWN";
  /** Capability ids whose status nobody has established. */
  unknownCapabilities: string[];
  reason: string;
};

export type MaterialCategory =
  | "kırtasiye"
  | "sunum"
  | "laboratuvar"
  | "elektrik"
  | "optik";

/**
 * Whether a single delivery of the workshop uses the material up. Judged per
 * lesson, not over the material's lifetime: a pencil wears out eventually but
 * running one workshop does not spend it, so it counts as reusable.
 */
export type MaterialKind = "consumable" | "reusable";

export type MaterialLine = {
  key: MaterialKey;
  label: string;
  category: MaterialCategory;
  kind: MaterialKind;
  // "student" lines are costed per learner, so quantityPerGroup already
  // multiplies the per-learner amount by the group size.
  basis: "group" | "student";
  quantityPerUnit: number;
  quantityPerGroup: number;
  totalQuantity: number;
  unitCostTry: number;
  totalCostTry: number;
  /**
   * Whether the teacher actually marked this material as available. Derived
   * from the submitted resource profile, never from a static per-material
   * flag: a material being common in Turkish classrooms says nothing about
   * whether *this* classroom has it.
   */
  inInventory: boolean;
  /** Money that must be spent, because the material is not in the inventory. */
  acquisitionCostTry: number;
  /** Money consumed by running the lesson once, for consumables only. */
  lessonCostTry: number;
};

export type PlanCosts = {
  /** Unchanged total the budget guard checks: unit cost times quantity. */
  totalTry: number;
  /** Subset of the total that has to be purchased. */
  acquisitionTry: number;
  /** Subset of the total consumed per delivery. */
  lessonTry: number;
  /** Turkish prices move; a figure without a date is not verifiable. */
  pricedOn: string;
};

export type Finding = {
  code: string;
  severity: "blocker" | "warning" | "info";
  message: string;
};

export type Stage = {
  key: "engage" | "explore" | "explain" | "elaborate" | "evaluate";
  name: string;
  shortName: string;
  minutes: number;
  title: string;
  teacherAction: string;
  studentAction: string;
  evidence: string;
  materialKeys: MaterialKey[];
  objectiveConnection: string;
};

export type WorkshopPlan = {
  id: string;
  mode: "REPLAY" | "LIVE";
  title: string;
  objective: {
    id: string;
    code: string;
    canonicalText: string;
    source: string;
    /**
     * `locked` means the text cannot change during generation. It has never
     * meant that anyone checked the mapping against the curriculum document,
     * and the interface must not read it that way.
     */
    locked: true;
    /**
     * Whether a human has verified the curriculum mapping behind this lock.
     *
     * - `verified`   — checked against the source document by a person
     * - `unverified` — transcribed from a source, awaiting that check
     * - `none`       — the topic makes no curriculum claim at all
     *
     * Optional so packages saved before this existed still render; those are
     * treated as unverified, which is what they were.
     */
    verification?: "verified" | "unverified" | "none";
  };
  profile: ResourceProfile;
  /**
   * Which corpus entry produced this plan, and which of its routes won. All
   * optional so packages saved before the corpus landed still render.
   */
  outcomeId?: string;
  /** Bilim Türkiye workshop domain and age cohort the topic belongs to. */
  domainId?: string;
  cohort?: string;
  /**
   * Whether the plan adapts an authored, pedagogue-approved session or drafts
   * a new one for a published catalogue topic nobody has written yet. Read by
   * every counter and badge that would otherwise present a proposal as
   * approved content.
   */
  topicStatus?: "authored" | "proposal";
  /** The published catalogue entry the topic implements, when there is one. */
  catalogueEntryId?: string | null;
  formatId?: string;
  routeId?: string;
  routeName?: string;
  routeTier?: "minimal" | "classroom" | "lab";
  rejectedRoutes?: RouteRejection[];
  /**
   * Routes that could not be confirmed because a venue facility's status is
   * unknown. Never merged into rejectedRoutes: doing so would restate missing
   * information as a verified absence.
   */
  uncertainRoutes?: RouteUncertainty[];
  /**
   * Every route the topic offers, ranked with the reasons behind each verdict.
   * Optional so packages saved before candidates existed still render.
   */
  candidates?: RouteCandidate[];
  /**
   * Stamped so a generation record issued before a deploy can be recognised as
   * predating the current generator rather than silently reused.
   */
  generatorVersion?: string;
  groupCount: number;
  estimatedCostTry: number;
  // Optional so packages generated before these breakdowns existed still render.
  costs?: PlanCosts;
  // Optional so packages generated before the shopping list existed still render.
  materialPlan?: MaterialLine[];
  adaptationSummary: string;
  stages: Stage[];
  findings: Finding[];
  generatedAt: string;
};
