import type { MaterialId } from "./materials";

export type StageKey = "engage" | "explore" | "explain" | "elaborate" | "evaluate";

export const STAGE_KEYS: readonly StageKey[] = [
  "engage",
  "explore",
  "explain",
  "elaborate",
  "evaluate",
];

/** Fixed 5E identity of each stage. Pedagogy, not content: never per-route. */
export const STAGE_IDENTITY: Record<StageKey, { name: string; shortName: string; ratio: number }> = {
  engage: { name: "Dikkat Çekme", shortName: "Merak", ratio: 0.12 },
  explore: { name: "Keşfetme", shortName: "Keşfet", ratio: 0.28 },
  explain: { name: "Açıklama", shortName: "Açıkla", ratio: 0.2 },
  elaborate: { name: "Derinleştirme", shortName: "Uygula", ratio: 0.25 },
  evaluate: { name: "Değerlendirme", shortName: "Kanıtla", ratio: 0.15 },
};

/**
 * The deterministic prose for one stage. In live mode a model rewrites these
 * five text fields; everything structural around them stays owned by code, so
 * a blueprint is the offline fallback and the shape the model must fill.
 */
export type StageBlueprint = {
  title: string;
  teacherAction: string;
  studentAction: string;
  evidence: string;
  objectiveConnection: string;
  materials: readonly MaterialId[];
};

export type MaterialRequirement = {
  materialId: MaterialId;
  /** "student" requirements are multiplied by the group size. */
  basis: "group" | "student";
  quantity: number;
};

/**
 * What a classroom must have for a route to be offered. Absent fields mean the
 * route does not care, which is what makes a minimal route eligible everywhere.
 */
export type RouteEligibility = {
  requiresElectricity?: boolean;
  requiresInternet?: boolean;
  requiredMaterials?: readonly MaterialId[];
};

/**
 * Richer tiers are preferred when a classroom can support them, so the order
 * here is the selection order.
 */
export type RouteTier = "minimal" | "classroom" | "lab";

export const ROUTE_TIER_ORDER: readonly RouteTier[] = ["lab", "classroom", "minimal"];

export type RouteDefinition = {
  id: string;
  name: string;
  tier: RouteTier;
  adaptationSummary: string;
  eligibility: RouteEligibility;
  materials: readonly MaterialRequirement[];
  /**
   * Only the stages that actually differ from the outcome's base narrative.
   * Keeping the diff explicit is what lets the interface explain why one route
   * was chosen over another instead of showing two opaque plans.
   */
  stageOverrides?: Partial<Record<StageKey, Partial<StageBlueprint>>>;
};

export type ApprovedOutcome = {
  code: string;
  canonicalText: string;
  gradeLevel: number;
  unit: string;
  unitOrder: number;
  source: {
    document: string;
    url?: string;
    accessedOn?: string;
    reference?: string;
  };
  /**
   * "verified" means a human checked the code and wording against the official
   * curriculum document. Until then the record stays "unverified" and the
   * interface says so, because a fabricated curriculum code is worse than a
   * missing one.
   */
  verification: "verified" | "unverified";
};

export type OutcomeContent = {
  outcome: ApprovedOutcome;
  title: string;
  baseStages: Record<StageKey, StageBlueprint>;
  routes: readonly RouteDefinition[];
};

const ELECTRIC_CIRCUITS: OutcomeContent = {
  outcome: {
    code: "F.7.7.1.1",
    canonicalText: "Seri ve paralel bağlı ampullerden oluşan bir devre şeması çizer.",
    gradeLevel: 7,
    unit: "Elektrik Devreleri",
    unitOrder: 7,
    source: { document: "MEB Fen Bilimleri Dersi Öğretim Programı (demo kaydı)" },
    verification: "unverified",
  },
  title: "Elektrik Devreleri: Aynı Kazanım, Gerçek İmkânlar",
  baseStages: {
    engage: {
      title: "Aynı ampuller, neden farklı parlaklık?",
      teacherAction:
        "İki farklı devre görselini gösterir ve öğrencilerin kanıta dayalı tahminlerini toplar.",
      studentAction:
        "Bireysel tahmin yapar, ardından grup arkadaşıyla gerekçesini karşılaştırır.",
      evidence:
        "Öğrenci, bağlantı biçimi ile ampul davranışı arasında test edilebilir bir ilişki kurar.",
      objectiveConnection:
        "Devre şemasındaki bağlantı biçimlerini ayırt etmeye hazırlık sağlar.",
      materials: ["paper", "pencil"],
    },
    explore: {
      title: "İnsan devresi: bağlantıyı modelle",
      teacherAction:
        "Seri ve paralel bağlantıyı ip halkaları yerine kâğıt şeritlerle modelleyen çevrimdışı görev kartlarını dağıtır.",
      studentAction:
        "Grup içinde akım yolunu canlandırır; ardından her modelin devre şemasını kâğıda çizer.",
      evidence:
        "İki düzenek/model için sembolleri ve bağlantı yollarını doğru gösteren şemalar üretir.",
      objectiveConnection: "Öğrenci seri ve paralel bağlantıyı doğrudan şemaya dönüştürür.",
      materials: ["paper", "pencil", "scissors", "tape"],
    },
    explain: {
      title: "Şema dili ortaklaşıyor",
      teacherAction:
        "Grupların çizimlerinden iki örnek seçer; devre sembolleri ve kapalı yol ölçütlerini birlikte netleştirir.",
      studentAction: "Kendi şemasını ölçüt kartıyla kontrol eder ve bir düzeltme notu ekler.",
      evidence:
        "Standart sembolleri kullanır ve seri/paralel bağlantının yol farkını sözlü açıklar.",
      objectiveConnection:
        "Kazanımın beklediği şema çizme dilini görünür ve ölçülebilir hâle getirir.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Devre Dominoları",
      teacherAction:
        "Her gruba bağlantı parçaları, şema sembolleri ve sonuç kartlarından oluşan kes-yapıştır setini verir.",
      studentAction:
        "Kartları eşleştirerek geçerli seri ve paralel devreler oluşturur; rakip grubun şemasındaki hatayı bulur.",
      evidence:
        "Yeni bir bağlamda geçerli bir devre şeması kurar ve hatalı bağlantıyı gerekçesiyle düzeltir.",
      objectiveConnection:
        "Şema çizme becerisini oyun içinde yeni devre örneklerine transfer eder.",
      materials: ["paper", "pencil", "scissors"],
    },
    evaluate: {
      title: "Çıkış bileti: iki yol, iki şema",
      teacherAction:
        "Her öğrenciye iki koşullu mini devre problemi verir ve ölçütlere göre hızlı kontrol yapar.",
      studentAction:
        "Bir seri, bir paralel devre şeması çizer; aralarındaki temel farkı tek cümleyle yazar.",
      evidence:
        "İki şemada sembol, bağlantı ve kapalı yol ölçütlerinin en az üçünü doğru karşılar.",
      objectiveConnection: "Kazanım, bireysel şema ürünü üzerinden doğrudan ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "electric-circuit-physical",
      name: "Fiziksel devre kurulumu",
      tier: "lab",
      adaptationSummary:
        "Mevcut devre setleriyle güvenli, fiziksel kurulum temelli akış seçildi.",
      eligibility: {
        requiresElectricity: true,
        requiredMaterials: ["battery", "led", "copper-wire"],
      },
      materials: [
        { materialId: "battery", basis: "group", quantity: 1 },
        { materialId: "led", basis: "group", quantity: 2 },
        { materialId: "copper-wire", basis: "group", quantity: 1 },
        { materialId: "paper", basis: "group", quantity: 2 },
        { materialId: "pencil", basis: "student", quantity: 1 },
      ],
      stageOverrides: {
        explore: {
          title: "Devreyi kur, şemayı çıkar",
          teacherAction:
            "Onaylı düşük gerilim devre setini dağıtır; güvenlik ve görev kartlarını açıklar.",
          studentAction:
            "İki bağlantı biçimini kurar, gözlemini kaydeder ve her düzenek için devre şeması çizer.",
          materials: ["battery", "led", "copper-wire", "paper", "pencil"],
        },
      },
    },
    {
      id: "electric-circuit-paper",
      name: "Kâğıt tabanlı insan-devresi modeli",
      tier: "minimal",
      adaptationSummary:
        "Devre seti ve enerji gerektirmeyen kâğıt tabanlı model; aynı şema kazanımını koruyacak biçimde seçildi.",
      // No requirements at all: this route is why a classroom with nothing but
      // stationery can still reach the outcome.
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "scissors", basis: "group", quantity: 1 },
        { materialId: "tape", basis: "group", quantity: 0.25 },
      ],
    },
  ],
};

export const CURRICULUM = {
  "electric-circuits": ELECTRIC_CIRCUITS,
} as const satisfies Record<string, OutcomeContent>;

export type OutcomeId = keyof typeof CURRICULUM;

export const OUTCOME_IDS = Object.keys(CURRICULUM) as [OutcomeId, ...OutcomeId[]];

/** The outcome the lab opens on until a teacher picks another. */
export const DEFAULT_OUTCOME_ID: OutcomeId = "electric-circuits";

export function getOutcomeContent(id: OutcomeId): OutcomeContent {
  return CURRICULUM[id];
}

export function isOutcomeId(value: string): value is OutcomeId {
  return Object.prototype.hasOwnProperty.call(CURRICULUM, value);
}

/** Every route in the corpus, for counters and matrix tests. */
export const ALL_ROUTES = OUTCOME_IDS.flatMap((outcomeId) =>
  CURRICULUM[outcomeId].routes.map((route) => ({ outcomeId, route })),
);
