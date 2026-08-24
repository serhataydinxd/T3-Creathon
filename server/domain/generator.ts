import { DEMO_OBJECTIVE, MATERIALS } from "./fixtures";
import type { Finding, ResourceProfile, Stage, WorkshopPlan } from "./types";

const STAGE_DISTRIBUTION = [0.12, 0.28, 0.2, 0.25, 0.15] as const;

function allocateMinutes(total: number): number[] {
  const values = STAGE_DISTRIBUTION.map((ratio) => Math.max(4, Math.round(total * ratio)));
  values[values.length - 1] += total - values.reduce((sum, value) => sum + value, 0);
  return values;
}

export function validateProfile(profile: ResourceProfile): Finding[] {
  const findings: Finding[] = [];
  if (profile.classSize < 6 || profile.classSize > 50) {
    findings.push({
      code: "GROUP_CAPACITY_MISMATCH",
      severity: "blocker",
      message: "Sınıf mevcudu 6–50 öğrenci aralığında olmalı.",
    });
  }
  if (profile.groupSize < 2 || profile.groupSize > 6) {
    findings.push({
      code: "GROUP_CAPACITY_MISMATCH",
      severity: "blocker",
      message: "Güvenli grup büyüklüğü 2–6 öğrenci aralığındadır.",
    });
  }
  if (profile.budgetTry < 0) {
    findings.push({
      code: "BUDGET_EXCEEDED",
      severity: "blocker",
      message: "Bütçe negatif olamaz.",
    });
  }
  return findings;
}

export function shouldUsePhysicalCircuit(profile: ResourceProfile): boolean {
  return (
    profile.hasElectricity &&
    (["battery", "led", "copper-wire"] as const).every((key) =>
      profile.materials.includes(key),
    )
  );
}

function buildStages(profile: ResourceProfile, physicalCircuit: boolean): Stage[] {
  const [engage, explore, explain, elaborate, evaluate] = allocateMinutes(
    profile.durationMinutes,
  );
  return [
    {
      key: "engage",
      name: "Dikkat Çekme",
      shortName: "Merak",
      minutes: engage,
      title: "Aynı ampuller, neden farklı parlaklık?",
      teacherAction:
        "İki farklı devre görselini gösterir ve öğrencilerin kanıta dayalı tahminlerini toplar.",
      studentAction:
        "Bireysel tahmin yapar, ardından grup arkadaşıyla gerekçesini karşılaştırır.",
      evidence: "Öğrenci, bağlantı biçimi ile ampul davranışı arasında test edilebilir bir ilişki kurar.",
      materialKeys: ["paper", "pencil"],
      objectiveConnection: "Devre şemasındaki bağlantı biçimlerini ayırt etmeye hazırlık sağlar.",
    },
    {
      key: "explore",
      name: "Keşfetme",
      shortName: "Keşfet",
      minutes: explore,
      title: physicalCircuit ? "Devreyi kur, şemayı çıkar" : "İnsan devresi: bağlantıyı modelle",
      teacherAction: physicalCircuit
        ? "Onaylı düşük gerilim devre setini dağıtır; güvenlik ve görev kartlarını açıklar."
        : "Seri ve paralel bağlantıyı ip halkaları yerine kâğıt şeritlerle modelleyen çevrimdışı görev kartlarını dağıtır.",
      studentAction: physicalCircuit
        ? "İki bağlantı biçimini kurar, gözlemini kaydeder ve her düzenek için devre şeması çizer."
        : "Grup içinde akım yolunu canlandırır; ardından her modelin devre şemasını kâğıda çizer.",
      evidence: "İki düzenek/model için sembolleri ve bağlantı yollarını doğru gösteren şemalar üretir.",
      materialKeys: physicalCircuit
        ? ["battery", "led", "copper-wire", "paper", "pencil"]
        : ["paper", "pencil", "scissors", "tape"],
      objectiveConnection: "Öğrenci seri ve paralel bağlantıyı doğrudan şemaya dönüştürür.",
    },
    {
      key: "explain",
      name: "Açıklama",
      shortName: "Açıkla",
      minutes: explain,
      title: "Şema dili ortaklaşıyor",
      teacherAction:
        "Grupların çizimlerinden iki örnek seçer; devre sembolleri ve kapalı yol ölçütlerini birlikte netleştirir.",
      studentAction: "Kendi şemasını ölçüt kartıyla kontrol eder ve bir düzeltme notu ekler.",
      evidence: "Standart sembolleri kullanır ve seri/paralel bağlantının yol farkını sözlü açıklar.",
      materialKeys: ["paper", "pencil"],
      objectiveConnection: "Kazanımın beklediği şema çizme dilini görünür ve ölçülebilir hâle getirir.",
    },
    {
      key: "elaborate",
      name: "Derinleştirme",
      shortName: "Uygula",
      minutes: elaborate,
      title: "Devre Dominoları",
      teacherAction:
        "Her gruba bağlantı parçaları, şema sembolleri ve sonuç kartlarından oluşan kes-yapıştır setini verir.",
      studentAction:
        "Kartları eşleştirerek geçerli seri ve paralel devreler oluşturur; rakip grubun şemasındaki hatayı bulur.",
      evidence: "Yeni bir bağlamda geçerli bir devre şeması kurar ve hatalı bağlantıyı gerekçesiyle düzeltir.",
      materialKeys: ["paper", "pencil", "scissors"],
      objectiveConnection: "Şema çizme becerisini oyun içinde yeni devre örneklerine transfer eder.",
    },
    {
      key: "evaluate",
      name: "Değerlendirme",
      shortName: "Kanıtla",
      minutes: evaluate,
      title: "Çıkış bileti: iki yol, iki şema",
      teacherAction: "Her öğrenciye iki koşullu mini devre problemi verir ve ölçütlere göre hızlı kontrol yapar.",
      studentAction: "Bir seri, bir paralel devre şeması çizer; aralarındaki temel farkı tek cümleyle yazar.",
      evidence: "İki şemada sembol, bağlantı ve kapalı yol ölçütlerinin en az üçünü doğru karşılar.",
      materialKeys: ["paper", "pencil"],
      objectiveConnection: "Kazanım, bireysel şema ürünü üzerinden doğrudan ölçülür.",
    },
  ];
}

export function generateWorkshop(profile: ResourceProfile): WorkshopPlan {
  const findings = validateProfile(profile);
  if (findings.some((finding) => finding.severity === "blocker")) {
    throw new Error(findings.map((finding) => finding.message).join(" "));
  }

  const usePhysicalCircuit = shouldUsePhysicalCircuit(profile);
  const stages = buildStages(profile, usePhysicalCircuit);
  const groupCount = Math.ceil(profile.classSize / profile.groupSize);
  const quantityPerGroup: Partial<Record<keyof typeof MATERIALS, number>> = usePhysicalCircuit
    ? { battery: 1, led: 2, "copper-wire": 1, paper: 2 }
    : { paper: 4, tape: 0.25 };
  const estimatedCostTry = Math.ceil(
    groupCount *
      Object.entries(quantityPerGroup).reduce(
        (sum, [key, quantity]) => sum + MATERIALS[key as keyof typeof MATERIALS].unitCostTry * quantity,
        0,
      ),
  );

  if (!profile.hasInternet) {
    findings.push({
      code: "OFFLINE_MEDIA_UNAVAILABLE",
      severity: "warning",
      message: "Video yerine yazdırılabilir görsel ve öğretmen anlatımı kullanıldı.",
    });
  }
  if (!usePhysicalCircuit) {
    findings.push({
      code: "APPROVED_SUBSTITUTION_APPLIED",
      severity: "info",
      message: "Devre seti, güvenli kâğıt tabanlı insan-devresi modeliyle değiştirildi.",
    });
  }
  if (profile.hardBudget && estimatedCostTry > profile.budgetTry) {
    findings.push({
      code: "BUDGET_EXCEEDED",
      severity: "blocker",
      message: `Tahmini ${estimatedCostTry} ₺ maliyet, ${profile.budgetTry} ₺ kesin bütçeyi aşıyor.`,
    });
  }
  if (profile.accessibilityNeeds.length > 0) {
    findings.push({
      code: "ACCESSIBILITY_ADAPTATION_APPLIED",
      severity: "info",
      message: "Kartlara yüksek kontrast, büyük punto ve sözlü yönerge alternatifi eklendi.",
    });
  }

  return {
    id: "replay-electric-circuit-v1",
    mode: "REPLAY",
    title: "Elektrik Devreleri: Aynı Kazanım, Gerçek İmkânlar",
    objective: { ...DEMO_OBJECTIVE, locked: true },
    profile,
    groupCount,
    estimatedCostTry,
    adaptationSummary: usePhysicalCircuit
      ? "Mevcut devre setleriyle güvenli, fiziksel kurulum temelli akış seçildi."
      : "Devre seti ve enerji gerektirmeyen kâğıt tabanlı model; aynı şema kazanımını koruyacak biçimde seçildi.",
    stages,
    findings,
    generatedAt: "2026-08-24T12:00:00.000Z",
  };
}

export const DEFAULT_PROFILE: ResourceProfile = {
  durationMinutes: 40,
  classSize: 30,
  groupSize: 5,
  budgetTry: 50,
  hardBudget: true,
  hasInternet: false,
  hasElectricity: false,
  materials: ["paper", "pencil", "scissors", "tape"],
  accessibilityNeeds: ["Yüksek kontrastlı basılı materyal"],
};
