export type MaterialKey =
  | "paper"
  | "pencil"
  | "scissors"
  | "tape"
  | "battery"
  | "led"
  | "copper-wire"
  | "projector";

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
};

export type MaterialLine = {
  key: MaterialKey;
  label: string;
  // "student" lines are costed per learner, so quantityPerGroup already
  // multiplies the per-learner amount by the group size.
  basis: "group" | "student";
  quantityPerUnit: number;
  quantityPerGroup: number;
  totalQuantity: number;
  unitCostTry: number;
  totalCostTry: number;
  availableByDefault: boolean;
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
  mode: "REPLAY";
  title: string;
  objective: {
    id: string;
    code: string;
    canonicalText: string;
    source: string;
    locked: true;
  };
  profile: ResourceProfile;
  groupCount: number;
  estimatedCostTry: number;
  // Optional so packages generated before the shopping list existed still render.
  materialPlan?: MaterialLine[];
  adaptationSummary: string;
  stages: Stage[];
  findings: Finding[];
  generatedAt: string;
};
