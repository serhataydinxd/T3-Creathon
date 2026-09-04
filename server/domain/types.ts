import type { MaterialId } from "@/server/content/materials";

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
   * Fixed facilities the venue offers. Optional in the type because profiles
   * captured before venues were modelled carry none; the request schema
   * defaults it so generate and save always hash identically.
   */
  capabilities?: string[];
};

/** Why a route the classroom could not support was set aside. */
export type RouteRejection = {
  routeId: string;
  routeName: string;
  code: "NO_ELECTRICITY" | "NO_INTERNET" | "MISSING_MATERIALS" | "MISSING_CAPABILITY";
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
    locked: true;
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
  routeId?: string;
  routeName?: string;
  routeTier?: "minimal" | "classroom" | "lab";
  rejectedRoutes?: RouteRejection[];
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
