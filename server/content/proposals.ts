import { AGE_COHORTS, WORKSHOP_DOMAINS } from "./domains";
import { CATALOGUE_THEMES, getCatalogueEntry, type CatalogueEntry } from "./catalogue";
import { INVENTORY_PRESETS, type MaterialId } from "./materials";
import type { MaterialRequirement, StageBlueprint, StageKey, WorkshopTopic } from "./curriculum";

/**
 * Content for a catalogue topic İMKÂN has not authored a session for yet.
 *
 * This is the "içerik geliştirme" half of the product. The corpus in
 * curriculum.ts holds sessions a pedagogue has approved; the catalogue holds
 * 183 topics Bilim Türkiye publishes, most of which nobody has written a
 * session for. A proposal is the bridge: a skeleton the model writes prose
 * into, which then enters the ordinary draft → inceleme → onay workflow and
 * comes out the other side as authored content.
 *
 * What a proposal deliberately does NOT do is invent structure. It carries a
 * single route that requires nothing, and its material list is drawn from what
 * the trainer said they already have. Every guarantee that makes a generated
 * package trustworthy — fixed stage count, code-computed durations, quantities
 * and cost, a budget guard the model cannot argue with — applies unchanged.
 * The model gets a blank page for the prose and nothing else.
 */

/**
 * The route a proposal runs on. Requires no electricity, no internet, no venue
 * facility and no specific material, so route selection cannot fail for a topic
 * whose real requirements nobody has worked out yet. Being unable to author a
 * plan is a worse failure than authoring a plain one.
 */
export const PROPOSAL_ROUTE_ID = "proposal-baseline";

/**
 * The only materials a proposal claims one of per learner.
 *
 * Everything else is claimed once per group. The registry prices single items —
 * one sheet, one pencil, one pair of scissors, one roll of tape — so a blanket
 * per-learner basis would have a thirty-child session buying thirty pairs of
 * scissors. A proposal has no authored activity behind it and therefore cannot
 * know how many of anything a learner needs, so one shared unit per group is
 * the conservative claim; paper and pencil are the exception because every
 * child writes.
 */
const PER_LEARNER: readonly MaterialId[] = ["paper", "pencil"];

/**
 * Materials a proposal is allowed to reach for: basic stationery, and only the
 * items the trainer marked as available. A topic nobody has costed must not
 * produce a shopping list, so this intersects rather than prescribes — the
 * acquisition cost of a proposal is always zero, by construction.
 */
function proposalMaterials(available: readonly MaterialId[]): MaterialRequirement[] {
  const core = INVENTORY_PRESETS.classroom.materials;
  return core
    .filter((materialId) => available.includes(materialId))
    .slice(0, 4)
    .map((materialId) => ({
      materialId,
      basis: PER_LEARNER.includes(materialId) ? ("student" as const) : ("group" as const),
      quantity: 1,
    }));
}

const SCAFFOLD: Record<StageKey, Omit<StageBlueprint, "materials">> = {
  engage: {
    title: "Konuya giriş sorusu",
    teacherAction:
      "Konuyu günlük hayattan tanıdık bir durumla açar ve katılımcıların ilk tahminlerini toplar.",
    studentAction: "Konuya dair bildiklerini ve merak ettiği bir soruyu yazar.",
    evidence: "Katılımcı, konuyla ilgili bir ön bilgi ya da soru ifade eder.",
    objectiveConnection: "Atölye konusunun kapsamı katılımcının kendi sorusuyla açılır.",
  },
  explore: {
    title: "Elde olanla ilk deneme",
    teacherAction:
      "Grupları kurar ve eldeki malzemelerle yapılacak ilk denemenin adımlarını gösterir.",
    studentAction: "Grubuyla birlikte denemeyi yapar ve gözlemlerini kaydeder.",
    evidence: "Katılımcı, denemesinin sonucunu kendi ifadesiyle kaydeder.",
    objectiveConnection: "Konu, anlatılmadan önce doğrudan deneyimlenir.",
  },
  explain: {
    title: "Ne gözlemledik?",
    teacherAction: "Grup gözlemlerini toplar ve konunun temel kavramını bu gözlemler üzerinden adlandırır.",
    studentAction: "Gözlemini kavramın adıyla eşleştirerek tek cümlede açıklar.",
    evidence: "Katılımcı, kavramı kendi gözlemine dayandırarak tanımlar.",
    objectiveConnection: "Kavram, katılımcının kendi verisi üzerinden kurulur.",
  },
  elaborate: {
    title: "Başka nerede işe yarar?",
    teacherAction: "Aynı kavramın geçtiği ikinci bir durum verir ve grupları bunu çözmeye yönlendirir.",
    studentAction: "Kavramı yeni duruma uygular ve gerekçesini yazar.",
    evidence: "Katılımcı, kavramı tanımadığı bir örneğe aktarır.",
    objectiveConnection: "Öğrenilen, tek bir etkinliğe bağlı kalmaz.",
  },
  evaluate: {
    title: "Kapanış ürünü",
    teacherAction: "Kısa bir çıkış ürünü ister ve ölçütlere göre hızlı kontrol yapar.",
    studentAction: "Öğrendiğini gösteren kısa bir çizim, liste ya da cümle üretir.",
    evidence: "Katılımcı, konuyu anladığını gösteren somut bir ürün teslim eder.",
    objectiveConnection: "Atölye konusu, bireysel bir ürün üzerinden gözlenir.",
  },
};

/**
 * Builds a topic for a catalogue entry that has no authored session.
 *
 * The available materials are a parameter because the proposal's route is
 * derived from the trainer's own inventory: the same catalogue entry produces
 * a different, equally valid skeleton in a bare classroom and a stocked one.
 */
export function buildProposalTopic(
  entryId: string,
  availableMaterials: readonly MaterialId[],
): WorkshopTopic {
  const entry: CatalogueEntry = getCatalogueEntry(entryId);
  const domain = WORKSHOP_DOMAINS[entry.domainId];
  const cohort = AGE_COHORTS[entry.cohort];
  const materials = proposalMaterials(availableMaterials);
  const materialIds = materials.map((requirement) => requirement.materialId);

  const stageKeys = Object.keys(SCAFFOLD) as StageKey[];
  const baseStages = {} as Record<StageKey, StageBlueprint>;
  for (const key of stageKeys) {
    baseStages[key] = { ...SCAFFOLD[key], materials: materialIds };
  }

  return {
    domainId: entry.domainId,
    cohort: entry.cohort,
    catalogueEntryId: entry.id,
    title: entry.title,
    summary: `${domain.label} kapsamında ${cohort.label} grubu için yayımlanmış atölye konusu.`,
    baseStages,
    routes: [
      {
        id: PROPOSAL_ROUTE_ID,
        name: "Taslak öneri rotası",
        tier: "minimal",
        adaptationSummary: `${entry.title} konusu için eldeki malzemelerle uygulanabilir bir taslak oturum önerisi.`,
        eligibility: {},
        materials,
      },
    ],
  };
}

/** The source page a proposal's locked topic name comes from. */
export function proposalSource(entryId: string): string {
  return CATALOGUE_THEMES[getCatalogueEntry(entryId).domainId].url;
}
