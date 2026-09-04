import type { MaterialId } from "./materials";
import type { AgeCohortId, WorkshopDomainId } from "./domains";
import type { VenueCapabilityId } from "./venues";

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
  /** Fixed venue facilities the route cannot run without. */
  requiredCapabilities?: readonly VenueCapabilityId[];
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
  /**
   * Reported as an informational finding when this route is chosen over a
   * richer one. Route-specific because "what was substituted" only makes sense
   * against the delivery that was set aside.
   */
  substitutionNote?: string;
  /** Surfaced as warnings the teacher must read before delivery. */
  safetyNotes?: readonly string[];
};

/**
 * A mapping onto an official curriculum outcome. Optional: a Bilim Türkiye
 * workshop topic exists in its own right, and only some topics correspond to a
 * MEB learning outcome. When one does, the mapping is what lets a visiting
 * school group see which outcome the session supports.
 */
export type CurriculumMapping = {
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

/**
 * One workshop topic: what Bilim Türkiye would run as an atölye session. Keyed
 * on domain and cohort, which are its identity; the curriculum mapping is an
 * optional property of it.
 */
export type WorkshopTopic = {
  domainId: WorkshopDomainId;
  cohort: AgeCohortId;
  title: string;
  /** One sentence a trainer could read out to describe the session. */
  summary: string;
  curriculumMapping?: CurriculumMapping;
  baseStages: Record<StageKey, StageBlueprint>;
  routes: readonly RouteDefinition[];
};

const TYMM = {
  document: "Fen Bilimleri Dersi Öğretim Programı (3-8), Türkiye Yüzyılı Maarif Modeli",
  accessedOn: "2026-09-03",
} as const;

/**
 * The 7th-grade corpus follows the Türkiye Yüzyılı Maarif Modeli, which applies
 * to this grade from 2026-2027. Codes, wording and unit names are transcribed
 * from the official unit pages recorded in content/outcomes-grade7.json and
 * remain "unverified" until a human checks them against the document; the
 * interface shows that state rather than implying approval.
 */

const SPACE_AGE: WorkshopTopic = {
  domainId: "astronomy-aviation-space",
  cohort: "12-14",
  summary:
    "Uzay gözlem araçlarını modelleyerek gök bilimi araçlarının işleyişini kavratır.",
  curriculumMapping: {
    code: "FB.7.1.2",
    canonicalText: "Uzay gözlem araçları ile ilgili bilimsel model oluşturabilme",
    gradeLevel: 7,
    unit: "Uzay Çağı",
    unitOrder: 1,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/416", reference: "7. Sınıf > 1. Ünite > FB.7.1.2" },
    verification: "unverified",
  },
  title: "Uzay Gözlem Araçları: Kendi Modelini Kur",
  baseStages: {
    engage: {
      title: "Çıplak gözle ne kadarını görebiliriz?",
      teacherAction: "Aynı gökyüzünün çıplak gözle ve gözlem aracıyla çekilmiş iki görselini gösterip tahminleri toplar.",
      studentAction: "İki görsel arasındaki farkı yazar ve bu farkın nedenine dair bir tahmin kurar.",
      evidence: "Öğrenci, gözlem aracının gözün sınırlarını genişlettiğini örnekle ifade eder.",
      objectiveConnection: "Modelin neyi temsil ettiğini sorgulamaya zemin hazırlar.",
      materials: ["paper", "pencil"],
    },
    explore: {
      title: "Kâğıttan gözlem aracı",
      teacherAction: "Kâğıdı rulo yaparak farklı açıklıkta gözlem tüpleri kurmayı adım adım anlatan görev kartlarını dağıtır.",
      studentAction: "İki farklı açıklıkta tüp kurar ve görüş alanının nasıl değiştiğini kaydeder.",
      evidence: "Öğrenci, açıklık ile görüş alanı arasındaki ilişkiyi kendi ölçümüyle gösterir.",
      objectiveConnection: "Model kurma sürecinin ilk somut ürünü ortaya çıkar.",
      materials: ["paper", "pencil", "tape"],
    },
    explain: {
      title: "Model neyi temsil ediyor?",
      teacherAction: "Grup modellerinden yola çıkarak toplayıcı açıklık, tüp ve göz merceği bölümlerini adlandırır.",
      studentAction: "Kendi modelinin bölümlerini etiketler ve her bölümün görevini tek cümleyle yazar.",
      evidence: "Öğrenci, modelin her bölümünü gerçek bir gözlem aracındaki işlevle eşleştirir.",
      objectiveConnection: "Bilimsel model kavramı, öğrencinin kendi ürünü üzerinden tanımlanır.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Hangi görev için hangi araç?",
      teacherAction: "Gezegen yüzeyi, radyo sinyali ve sönük gökada gözlemi içeren üç görev kartı verir.",
      studentAction: "Her görev için uygun gözlem aracını seçer ve seçimini modelinin özelliğine dayandırır.",
      evidence: "Öğrenci, araç seçimini gözlem amacına dayanarak gerekçelendirir.",
      objectiveConnection: "Model, yeni bir gözlem problemine transfer edilir.",
      materials: ["paper", "pencil"],
    },
    evaluate: {
      title: "Model kartı",
      teacherAction: "Her öğrenciden etiketli bir model kartı ister ve ölçütlere göre hızlı kontrol yapar.",
      studentAction: "Kendi gözlem aracı modelini çizer, üç bölümünü etiketler ve amacını yazar.",
      evidence: "Öğrenci, etiketli model ve amaç cümlesini eksiksiz üretir.",
      objectiveConnection: "Kazanım, bireysel model ürünü üzerinden doğrudan ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "space-age-planetarium",
      name: "Planetaryum kubbesinde gök gözlemi",
      tier: "lab",
      adaptationSummary:
        "Planetaryum kubbesinde gerçek gökyüzü benzetimi izlenerek gözlem aracının ne işe yaradığı doğrudan deneyimlenir.",
      eligibility: { requiredCapabilities: ["planetarium"] },
      materials: [
        { materialId: "paper", basis: "group", quantity: 2 },
        { materialId: "pencil", basis: "student", quantity: 1 },
      ],
      stageOverrides: {
        explore: {
          title: "Kubbe altında ne kadarını görüyoruz?",
          teacherAction:
            "Kubbede aynı gökyüzünü çıplak göz ve teleskop görüş alanıyla sırayla gösterir; her gösterimde neye dikkat edileceğini söyler.",
          studentAction:
            "İki gösterim arasındaki farkı kaydeder ve gözlem aracının hangi ayrıntıyı eklediğini yazar.",
          evidence:
            "Öğrenci, gözlem aracının kazandırdığı ayrıntıyı kubbede gördüğü iki görüntüyü karşılaştırarak gösterir.",
          materials: ["paper", "pencil"],
        },
        elaborate: {
          title: "Gösterimi kendi modeline bağla",
          teacherAction:
            "Kubbede izlenen gök cisimlerinden birini seçtirir ve hangi gözlem aracıyla incelenebileceğini tartıştırır.",
          studentAction:
            "Seçtiği gök cismi için uygun gözlem aracını belirler ve kubbede gördüğü kanıta dayandırır.",
          materials: ["paper", "pencil"],
        },
      },
      safetyNotes: [
        "Kubbe içinde karanlık ortam kuralları uygulanır; öğrenciler koltuklarında kalır ve gösterim sırasında salonda dolaşılmaz.",
      ],
    },
    {
      id: "space-age-magnifier",
      name: "Büyüteçli mercek incelemesi",
      tier: "lab",
      adaptationSummary: "Büyüteç kullanılarak merceğin görüntüyü nasıl değiştirdiği doğrudan gözlenir.",
      eligibility: { requiredMaterials: ["magnifier"] },
      materials: [
        { materialId: "paper", basis: "group", quantity: 3 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "tape", basis: "group", quantity: 0.25 },
        { materialId: "magnifier", basis: "group", quantity: 1 },
      ],
      stageOverrides: {
        explore: {
          title: "Mercekli tüp: görüntü nasıl değişiyor?",
          teacherAction: "Kâğıt tüpün ucuna büyüteç yerleştirmeyi gösterir ve güvenli gözlem kuralını hatırlatır.",
          studentAction: "Büyüteçli ve büyüteçsiz tüple aynı nesneyi gözler, iki görüntüyü karşılaştırarak kaydeder.",
          materials: ["paper", "pencil", "tape", "magnifier"],
        },
      },
      safetyNotes: ["Büyüteçle Güneş'e veya güçlü ışık kaynağına doğrudan bakılmaz."],
    },
    {
      id: "space-age-paper",
      name: "Kâğıt tabanlı gözlem aracı modeli",
      tier: "minimal",
      adaptationSummary: "Yalnızca kâğıt ve kalemle kurulabilen model; aynı model oluşturma çıktısını korur.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 3 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "tape", basis: "group", quantity: 0.25 },
      ],
      substitutionNote: "Optik donanım yerine kâğıt tüp modeli kullanıldı; model oluşturma çıktısı korundu.",
    },
  ],
};

const FORCE_AND_ENERGY: WorkshopTopic = {
  domainId: "technology",
  cohort: "12-14",
  summary:
    "Kinetik ve potansiyel enerjiyi ölçüm yaparak karşılaştırtır.",
  curriculumMapping: {
    code: "FB.7.2.2",
    canonicalText: "Enerji çeşitlerinden kinetik ve potansiyel enerjiyi karşılaştırabilme",
    gradeLevel: 7,
    unit: "Kuvvet Ve Enerjiyi Keşfedelim",
    unitOrder: 2,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/429", reference: "7. Sınıf > 2. Ünite > FB.7.2.2" },
    verification: "unverified",
  },
  title: "Kinetik ve Potansiyel Enerji: Yükseklik mi, Hız mı?",
  baseStages: {
    engage: {
      title: "Aynı top, iki yükseklik",
      teacherAction: "Aynı kâğıt topu iki farklı yükseklikten bırakır ve hangisinin daha belirgin iz bırakacağını sorar.",
      studentAction: "Tahminini yazar ve gerekçesini grup arkadaşıyla karşılaştırır.",
      evidence: "Öğrenci, yükseklik ile çarpma etkisi arasında test edilebilir bir tahmin kurar.",
      objectiveConnection: "İki enerji çeşidini karşılaştırma ihtiyacını görünür kılar.",
      materials: ["paper", "pencil"],
    },
    explore: {
      title: "Yükseklik–iz ilişkisini ölç",
      teacherAction: "Üç ölçülü yükseklikten bırakma ve izi kaydetme adımlarını içeren görev kartlarını dağıtır.",
      studentAction: "Topu cetvelle ölçülen üç yükseklikten bırakır ve sonucu tabloya kaydeder.",
      evidence: "Öğrenci, üç yükseklik için ölçüm tablosunu eksiksiz doldurur.",
      objectiveConnection: "Karşılaştırma, öğrencinin kendi verisi üzerine kurulur.",
      materials: ["paper", "pencil", "ruler"],
    },
    explain: {
      title: "İki enerji, tek olay",
      teacherAction: "Yükseklikte depolanan enerjiyi potansiyel, harekete geçen enerjiyi kinetik olarak adlandırır.",
      studentAction: "Kendi tablosunda potansiyelin en büyük ve kinetiğin en büyük olduğu anları işaretler.",
      evidence: "Öğrenci, aynı olayın iki anını doğru enerji çeşidiyle eşleştirir.",
      objectiveConnection: "Kazanımın istediği karşılaştırma dili öğrencinin verisine bağlanır.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Kütle değişirse ne olur?",
      teacherAction: "Aynı yükseklikten bırakılmak üzere ikinci ve daha ağır bir kâğıt top hazırlatır.",
      studentAction: "İki topu aynı yükseklikten bırakır ve kütlenin etkisini tek cümleyle yazar.",
      evidence: "Öğrenci, kütle değişiminin kinetik enerjiye etkisini kendi gözlemiyle açıklar.",
      objectiveConnection: "Karşılaştırma, yeni bir değişkenle sınanır.",
      materials: ["paper", "pencil"],
    },
    evaluate: {
      title: "Karşılaştırma cümlesi",
      teacherAction: "Boş bir karşılaştırma tablosu dağıtır ve ölçütlere göre hızlı kontrol yapar.",
      studentAction: "Tabloyu doldurur ve kinetik ile potansiyel enerjiyi karşılaştıran tek bir cümle yazar.",
      evidence: "Öğrenci, iki enerji çeşidini ölçüte uygun biçimde karşılaştırır.",
      objectiveConnection: "Kazanım, bireysel karşılaştırma ürünü üzerinden ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "force-energy-clay",
      name: "Hamur kütleli düşme deneyi",
      tier: "classroom",
      adaptationSummary: "Oyun hamuruyla kütlesi ölçülebilir toplar kullanılarak karşılaştırma nicelleştirilir.",
      eligibility: { requiredMaterials: ["modeling-clay"] },
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "ruler", basis: "group", quantity: 1 },
        { materialId: "modeling-clay", basis: "group", quantity: 1 },
      ],
      stageOverrides: {
        elaborate: {
          title: "Kütleyi ikiye katla",
          teacherAction: "Her gruba eşit hacimde hamur verir ve kütlesi iki kat olan ikinci topu hazırlatır.",
          studentAction: "İki farklı kütleyi aynı yükseklikten bırakır, izleri karşılaştırır ve sonucu tabloya işler.",
          materials: ["modeling-clay", "paper", "pencil", "ruler"],
        },
      },
    },
    {
      id: "force-energy-paper",
      name: "Kâğıt top ile düşme deneyi",
      tier: "minimal",
      adaptationSummary: "Kâğıt top ve cetvelle yürütülen ölçüm; ek donanım gerektirmez.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "ruler", basis: "group", quantity: 1 },
      ],
      substitutionNote: "Kütle karşılaştırması hamur yerine katlanmış kâğıt toplarla yapıldı.",
    },
  ],
};

const BODY_SYSTEMS: WorkshopTopic = {
  domainId: "natural-sciences",
  cohort: "12-14",
  summary:
    "Sindirim sistemini model üzerinde izleyerek yapı ve görev ilişkisini kurdurur.",
  curriculumMapping: {
    code: "FB.7.3.1",
    canonicalText: "Sindirim sistemini oluşturan yapı ve organların görevlerini model üzerinde gözlemleyebilme",
    gradeLevel: 7,
    unit: "Vücudumuzdaki Sistemler",
    unitOrder: 3,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/430", reference: "7. Sınıf > 3. Ünite > FB.7.3.1" },
    verification: "unverified",
  },
  title: "Sindirim Sistemi: Modelde Görev Takibi",
  baseStages: {
    engage: {
      title: "Bir lokma nereden nereye gidiyor?",
      teacherAction: "Bir lokmanın yolculuğunu sorar ve öğrencilerin sıralama tahminlerini tahtada toplar.",
      studentAction: "Lokmanın geçtiğini düşündüğü yapıları sırayla yazar.",
      evidence: "Öğrenci, sindirim yolunu sıralı bir tahmin olarak ifade eder.",
      objectiveConnection: "Model üzerinde gözlemlenecek sıralamanın ön bilgisini ortaya çıkarır.",
      materials: ["paper", "pencil"],
    },
    explore: {
      title: "Kâğıt şeritten sindirim yolu",
      teacherAction: "Organ kartlarını ve ölçekli kâğıt şeridi dağıtır; sıralama görevini açıklar.",
      studentAction: "Organ kartlarını keser, kâğıt şerit üzerinde doğru sıraya yerleştirir ve yapıştırır.",
      evidence: "Öğrenci, organları sindirim yolundaki doğru sırayla modelde konumlandırır.",
      objectiveConnection: "Kazanımın istediği model üzerinde gözlem doğrudan kurulur.",
      materials: ["paper", "pencil", "scissors", "glue-stick"],
    },
    explain: {
      title: "Her organın bir görevi var",
      teacherAction: "Grup modellerinden yola çıkarak mekanik ve kimyasal sindirimin nerede gerçekleştiğini netleştirir.",
      studentAction: "Modelindeki her organın yanına görevini tek cümleyle yazar.",
      evidence: "Öğrenci, en az dört organı görevleriyle doğru eşleştirir.",
      objectiveConnection: "Model, yapı ve görev ilişkisini görünür hâle getirir.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Model üzerinde arıza avı",
      teacherAction: "Bir organın görevinin aksadığı üç senaryo kartı verir.",
      studentAction: "Her senaryoda hangi organın etkilendiğini modeli üzerinde göstererek gerekçelendirir.",
      evidence: "Öğrenci, görev aksaması ile organ arasındaki ilişkiyi model üzerinde kurar.",
      objectiveConnection: "Yapı–görev ilişkisi yeni bir bağlama taşınır.",
      materials: ["paper", "pencil"],
    },
    evaluate: {
      title: "Boş model, etiketli çıkış",
      teacherAction: "Etiketsiz bir sindirim sistemi şeması dağıtır ve ölçütlerle kontrol eder.",
      studentAction: "Şemadaki organları etiketler ve iki organın görevini yazar.",
      evidence: "Öğrenci, etiketleme ve görev yazımını ölçütlere uygun tamamlar.",
      objectiveConnection: "Kazanım, bireysel model okuma ürünü üzerinden ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "body-systems-physical",
      name: "Poşet ve pipetle fiziksel model",
      tier: "classroom",
      adaptationSummary: "Şeffaf poşet mide, pipet yemek borusu olarak kullanılarak model elle çalıştırılır.",
      eligibility: { requiredMaterials: ["zip-bag", "straw", "plastic-cup"] },
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "scissors", basis: "group", quantity: 1 },
        { materialId: "zip-bag", basis: "group", quantity: 1 },
        { materialId: "straw", basis: "group", quantity: 2 },
        { materialId: "plastic-cup", basis: "group", quantity: 2 },
      ],
      stageOverrides: {
        elaborate: {
          title: "Mideyi çalıştır",
          teacherAction: "Poşete su ve küçük ekmek parçası koyup dıştan sıkma yöntemini gösterir; ağza alma yasağını hatırlatır.",
          studentAction: "Poşeti dıştan sıkarak mekanik sindirimi gözler ve gözlemini modeline not eder.",
          materials: ["zip-bag", "straw", "plastic-cup", "paper", "pencil"],
        },
      },
      safetyNotes: ["Model malzemeleri ağza alınmaz; deney sonunda eller yıkanır."],
    },
    {
      id: "body-systems-paper",
      name: "Kâğıt şerit modeli",
      tier: "minimal",
      adaptationSummary: "Yalnızca kırtasiye ile kurulan şerit model; model üzerinde gözlem çıktısını korur.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "scissors", basis: "group", quantity: 1 },
        { materialId: "glue-stick", basis: "group", quantity: 0.25 },
      ],
      substitutionNote: "Fiziksel mide modeli yerine kâğıt şerit üzerinde sıralama modeli kullanıldı.",
    },
  ],
};

const LIGHT_AND_LENSES: WorkshopTopic = {
  domainId: "natural-sciences",
  cohort: "12-14",
  summary:
    "Işığın ortam değiştirirken izlediği yolu gözleterek kırılma çıkarımı yaptırır.",
  curriculumMapping: {
    code: "FB.7.4.1",
    canonicalText: "Ortam değiştiren ışığın izlediği yolu gözlemleyerek kırılma olayına yönelik bilimsel çıkarım yapabilme",
    gradeLevel: 7,
    unit: "Işığın Kırılması Ve Mercekler",
    unitOrder: 4,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/431", reference: "7. Sınıf > 4. Ünite > FB.7.4.1" },
    verification: "unverified",
  },
  title: "Işığın Kırılması: Yol Değiştiren Işın",
  baseStages: {
    engage: {
      title: "Bardaktaki kalem neden kırık görünüyor?",
      teacherAction: "Su dolu bardağa kalem koyar, sınıfa gösterir ve nedenine dair tahminleri toplar.",
      studentAction: "Gördüğü görüntüyü çizer ve neden böyle göründüğüne dair tahminini yazar.",
      evidence: "Öğrenci, gözlemini çizimle kaydeder ve test edilebilir bir tahmin kurar.",
      objectiveConnection: "Kırılma olayına yönelik çıkarımın çıkış noktasını oluşturur.",
      materials: ["paper", "pencil", "plastic-cup"],
    },
    explore: {
      title: "Işının yolunu izle",
      teacherAction: "Bardağın arkasına çizgili kâğıt koyarak çizgilerin kayışını gözlemleme görevini dağıtır.",
      studentAction: "Bardağı çizgili kâğıdın önünde hareket ettirir ve çizgilerin nasıl kaydığını kaydeder.",
      evidence: "Öğrenci, ortam değişiminde görüntünün kaydığını kendi gözlemiyle gösterir.",
      objectiveConnection: "Işığın yol değiştirdiğine dair veri öğrencinin elinde toplanır.",
      materials: ["paper", "pencil", "plastic-cup"],
    },
    explain: {
      title: "Kırılma nerede oluyor?",
      teacherAction: "Hava–su sınırını çizerek gelen ve kırılan ışın kavramlarını adlandırır.",
      studentAction: "Kendi çiziminde sınırı işaretler ve gelen ile kırılan ışını ayrı ayrı çizer.",
      evidence: "Öğrenci, kırılmanın iki ortamın sınırında oluştuğunu çiziminde gösterir.",
      objectiveConnection: "Gözlem, kazanımın istediği bilimsel çıkarıma dönüştürülür.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Tahmin et, sonra bak",
      teacherAction: "Farklı derinlik ve bakış açısı içeren üç durum kartı verir.",
      studentAction: "Her durum için görüntünün nereye kayacağını önce çizer, sonra bardakla sınar.",
      evidence: "Öğrenci, çıkarımını yeni bir durumda önceden tahmin ederek sınar.",
      objectiveConnection: "Çıkarım, tahmin–sınama döngüsüyle pekiştirilir.",
      materials: ["paper", "pencil", "plastic-cup"],
    },
    evaluate: {
      title: "Çıkarım cümlesi ve şema",
      teacherAction: "Boş bir sınır şeması dağıtır ve ölçütlere göre hızlı kontrol yapar.",
      studentAction: "Şemaya gelen ve kırılan ışını çizer; kırılmanın nedenini tek cümleyle yazar.",
      evidence: "Öğrenci, şema ve çıkarım cümlesini ölçütlere uygun üretir.",
      objectiveConnection: "Kazanım, bireysel çıkarım ürünü üzerinden ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "light-lenses-convex",
      name: "Yakınsak mercekle kırılma incelemesi",
      tier: "lab",
      adaptationSummary: "Yakınsak mercekle ışığın yol değişimi doğrudan izlenir ve odak kavramı gözlemlenir.",
      eligibility: { requiredMaterials: ["convex-lens"] },
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "plastic-cup", basis: "group", quantity: 1 },
        { materialId: "convex-lens", basis: "group", quantity: 1 },
      ],
      stageOverrides: {
        elaborate: {
          title: "Mercekte odak avı",
          teacherAction: "Sınıf içi lamba ışığıyla merceğin görüntüyü nasıl topladığını gösterir ve güneş yasağını yazılı olarak hatırlatır.",
          studentAction: "Merceği kâğıda yaklaştırıp uzaklaştırır, görüntünün netleştiği uzaklığı ölçer ve kaydeder.",
          materials: ["convex-lens", "paper", "pencil", "ruler"],
        },
      },
      safetyNotes: [
        "Mercek hiçbir koşulda Güneş'e doğrultulmaz: güneş ışığını odaklayarak yanığa ve yangına yol açabilir.",
        "Etkinlik yalnızca sınıf içi yapay ışık kaynağıyla ve öğretmen gözetiminde yürütülür.",
      ],
    },
    {
      id: "light-lenses-water",
      name: "Su bardağıyla kırılma gözlemi",
      tier: "minimal",
      adaptationSummary: "Su dolu şeffaf bardakla yürütülen gözlem; mercek gerektirmez, aynı çıkarımı hedefler.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "plastic-cup", basis: "group", quantity: 1 },
      ],
      substitutionNote: "Mercek yerine su dolu bardak kullanıldı; kırılma gözlemi ve çıkarım korundu.",
      safetyNotes: ["Su dökülmelerine karşı masalar korunur; cam yerine plastik bardak kullanılır."],
    },
  ],
};

const NATURE_OF_MATTER: WorkshopTopic = {
  domainId: "natural-sciences",
  cohort: "12-14",
  summary:
    "Farklı moleküllerin modelini kurdurarak maddenin yapısını görünür kılar.",
  curriculumMapping: {
    code: "FB.7.5.3",
    canonicalText: "Farklı moleküllere ait bilimsel model oluşturabilme",
    gradeLevel: 7,
    unit: "Maddenin Doğasına Yolculuk",
    unitOrder: 5,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/432", reference: "7. Sınıf > 5. Ünite > FB.7.5.3" },
    verification: "unverified",
  },
  title: "Molekül Modelleri: Aynı Atomlar, Farklı Diziliş",
  baseStages: {
    engage: {
      title: "İki molekül, aynı atomlar",
      teacherAction: "Aynı atomlardan oluşan iki farklı molekül adını yazar ve farkın nerede olabileceğini sorar.",
      studentAction: "Farkın nereden geldiğine dair tahminini yazar.",
      evidence: "Öğrenci, molekül farkını atom sayısı veya dizilişiyle ilişkilendiren bir tahmin kurar.",
      objectiveConnection: "Model oluşturma ihtiyacını öğrencinin sorusuna bağlar.",
      materials: ["paper", "pencil"],
    },
    explore: {
      title: "Kâğıt atomlarla molekül kur",
      teacherAction: "Farklı boy ve renkte kâğıt daireleri ve üç molekül görev kartını dağıtır.",
      studentAction: "Kâğıt atomları keserek görev kartındaki üç molekülün modelini kurar.",
      evidence: "Öğrenci, üç molekül için atom sayısını ve bağ düzenini modelinde doğru gösterir.",
      objectiveConnection: "Kazanımın istediği model oluşturma doğrudan uygulanır.",
      materials: ["paper", "pencil", "scissors", "glue-stick"],
    },
    explain: {
      title: "Modelin dili",
      teacherAction: "Atom, molekül ve bağ terimlerini grup modelleri üzerinden netleştirir.",
      studentAction: "Modelinin altına atom sayısını ve molekül adını yazar.",
      evidence: "Öğrenci, modelini doğru terimlerle adlandırır.",
      objectiveConnection: "Model, bilimsel gösterim diline bağlanır.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Modelden moleküle",
      teacherAction: "Adı verilmeyen iki model gösterir ve hangi molekül olabileceğini sorar.",
      studentAction: "Verilen modellerin hangi moleküle ait olabileceğini gerekçesiyle yazar.",
      evidence: "Öğrenci, model okumayı ters yönde de yapabildiğini gösterir.",
      objectiveConnection: "Model oluşturma becerisi model okumaya genişletilir.",
      materials: ["paper", "pencil"],
    },
    evaluate: {
      title: "Kendi molekül kartın",
      teacherAction: "Boş model kartı dağıtır ve ölçütlere göre kontrol eder.",
      studentAction: "Seçtiği bir molekülün modelini kurar, adlandırır ve atom sayısını yazar.",
      evidence: "Öğrenci, model, ad ve atom sayısını eksiksiz üretir.",
      objectiveConnection: "Kazanım, bireysel model ürünü üzerinden ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "matter-exhibition-stations",
      name: "Sergi alanında deney düzeneği turu",
      tier: "lab",
      adaptationSummary:
        "Sergi alanındaki etkileşimli düzenekler kullanılarak molekül modelleri gerçek gösterimlerle karşılaştırılır.",
      eligibility: { requiredCapabilities: ["exhibition"] },
      materials: [
        { materialId: "paper", basis: "group", quantity: 3 },
        { materialId: "pencil", basis: "student", quantity: 1 },
      ],
      stageOverrides: {
        elaborate: {
          title: "Düzenekten modele",
          teacherAction:
            "Sergi alanındaki madde ve molekül düzeneklerinden ikisini gösterir ve gözlem görevini dağıtır.",
          studentAction:
            "Düzenekte gördüğü yapıyı kendi kâğıt modeliyle karşılaştırır ve iki farkı yazar.",
          evidence:
            "Öğrenci, kendi modelini sergi düzeneğindeki gösterimle karşılaştırarak eksiğini belirler.",
          materials: ["paper", "pencil"],
        },
      },
    },
    {
      id: "matter-clay-models",
      name: "Hamur ve ataşla top-çubuk modeli",
      tier: "classroom",
      adaptationSummary: "Oyun hamuru atom, ataş bağ olarak kullanılarak üç boyutlu top-çubuk modeli kurulur.",
      eligibility: { requiredMaterials: ["modeling-clay", "paper-clip"] },
      materials: [
        { materialId: "modeling-clay", basis: "group", quantity: 1 },
        { materialId: "paper-clip", basis: "group", quantity: 12 },
        { materialId: "paper", basis: "group", quantity: 2 },
        { materialId: "pencil", basis: "student", quantity: 1 },
      ],
      stageOverrides: {
        explore: {
          title: "Üç boyutlu molekül kur",
          teacherAction: "Hamurdan eşit atomlar ve ataşla bağ kurma adımlarını gösterir.",
          studentAction: "Üç molekülün top-çubuk modelini hamur ve ataşla kurar, bağ sayısını kaydeder.",
          materials: ["modeling-clay", "paper-clip", "paper", "pencil"],
        },
      },
      safetyNotes: ["Ataş uçları küt tarafı yukarı yerleştirilir; hamur ağza alınmaz."],
    },
    {
      id: "matter-paper-models",
      name: "Kâğıt daire molekül modeli",
      tier: "minimal",
      adaptationSummary: "Kâğıt dairelerle kurulan düzlemsel model; ek malzeme gerektirmez.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "scissors", basis: "group", quantity: 1 },
        { materialId: "glue-stick", basis: "group", quantity: 0.25 },
      ],
      substitutionNote: "Üç boyutlu top-çubuk seti yerine kâğıt daire modeli kullanıldı.",
    },
  ],
};

const ELECTRIFICATION: WorkshopTopic = {
  domainId: "technology",
  cohort: "12-14",
  summary:
    "Sürtme, dokunma ve etki ile elektriklenmeyi deneyle ayırt ettirir.",
  curriculumMapping: {
    code: "FB.7.6.2",
    canonicalText: "Elektriklenme çeşitlerini belirlemeye yönelik deney yapabilme",
    gradeLevel: 7,
    unit: "Elektriklenme",
    unitOrder: 6,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/433", reference: "7. Sınıf > 6. Ünite > FB.7.6.2" },
    verification: "unverified",
  },
  title: "Elektriklenme Çeşitleri: Sürtme, Dokunma, Etki",
  baseStages: {
    engage: {
      title: "Kalem kâğıdı neden çekiyor?",
      teacherAction: "Kalemi kâğıt mendile sürtüp küçük kâğıt parçalarına yaklaştırır ve tahminleri toplar.",
      studentAction: "Gözlemini yazar ve çekmenin nedenine dair bir tahmin kurar.",
      evidence: "Öğrenci, sürtünme ile çekim arasında test edilebilir bir ilişki kurar.",
      objectiveConnection: "Elektriklenme çeşitlerini belirleme deneyinin sorusunu ortaya koyar.",
      materials: ["paper", "pencil", "tissue"],
    },
    explore: {
      title: "Üç istasyon, üç yol",
      teacherAction: "Sürtme, dokunma ve etki ile elektriklenmeyi ayrı ayrı sınayan üç istasyon kartı dağıtır.",
      studentAction: "Her istasyonda deneyi yapar ve kâğıt parçalarının davranışını tabloya kaydeder.",
      evidence: "Öğrenci, üç durumun gözlem sonuçlarını ayrı ayrı kaydeder.",
      objectiveConnection: "Kazanımın istediği deney doğrudan yürütülür.",
      materials: ["paper", "pencil", "tissue"],
    },
    explain: {
      title: "Hangi yol, hangi ad?",
      teacherAction: "Üç istasyonu sürtünme, dokunma ve etki ile elektriklenme olarak adlandırır.",
      studentAction: "Tablosundaki her satırı doğru elektriklenme çeşidiyle etiketler.",
      evidence: "Öğrenci, üç elektriklenme çeşidini gözlemleriyle doğru eşleştirir.",
      objectiveConnection: "Deney sonuçları kazanımın terimlerine bağlanır.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Günlük hayatta hangisi?",
      teacherAction: "Kazak çıkarma, kapı kolu ve balon gibi üç günlük durum kartı verir.",
      studentAction: "Her durumda hangi elektriklenme çeşidinin işlediğini gerekçesiyle yazar.",
      evidence: "Öğrenci, elektriklenme çeşidini yeni bir bağlamda doğru belirler.",
      objectiveConnection: "Belirleme becerisi sınıf dışına taşınır.",
      materials: ["paper", "pencil"],
    },
    evaluate: {
      title: "Deney raporu",
      teacherAction: "Boş bir deney raporu formu dağıtır ve ölçütlerle kontrol eder.",
      studentAction: "Seçtiği bir elektriklenme çeşidi için deney adımlarını, gözlemini ve sonucunu yazar.",
      evidence: "Öğrenci, deney adımı, gözlem ve sonuç bölümlerini eksiksiz doldurur.",
      objectiveConnection: "Kazanım, bireysel deney raporu üzerinden ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "electrification-electroscope",
      name: "Bardak elektroskobuyla ölçüm",
      tier: "classroom",
      adaptationSummary: "Plastik bardak ve ataşla kurulan basit elektroskopla yüklenme dolaylı olarak gözlenir.",
      eligibility: { requiredMaterials: ["plastic-cup", "paper-clip", "straw"] },
      materials: [
        { materialId: "plastic-cup", basis: "group", quantity: 1 },
        { materialId: "paper-clip", basis: "group", quantity: 2 },
        { materialId: "straw", basis: "group", quantity: 1 },
        { materialId: "paper", basis: "group", quantity: 3 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "tissue", basis: "group", quantity: 1 },
      ],
      stageOverrides: {
        elaborate: {
          title: "Elektroskobu kur ve sına",
          teacherAction: "Bardak, ataş ve kâğıt şeritle basit elektroskop kurmayı gösterir.",
          studentAction: "Elektroskobu kurar, sürtülmüş pipeti yaklaştırır ve şeritlerin açılmasını kaydeder.",
          materials: ["plastic-cup", "paper-clip", "straw", "paper", "pencil"],
        },
      },
      safetyNotes: [
        "Etkinlik yalnızca sürtünme ile elektriklenme üzerinedir; şebeke elektriği veya priz kullanılmaz.",
      ],
    },
    {
      id: "electrification-friction",
      name: "Kalem ve mendille sürtünme deneyi",
      tier: "minimal",
      adaptationSummary: "Kalem, kâğıt mendil ve kâğıt parçalarıyla yürütülen deney; ek donanım gerektirmez.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 3 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "tissue", basis: "group", quantity: 1 },
      ],
      substitutionNote: "Elektroskop yerine kâğıt parçalarının çekilmesi gözlemi kullanıldı.",
      safetyNotes: [
        "Etkinlik yalnızca sürtünme ile elektriklenme üzerinedir; şebeke elektriği veya priz kullanılmaz.",
      ],
    },
  ],
};

const SUSTAINABLE_LIFE: WorkshopTopic = {
  domainId: "natural-sciences",
  cohort: "12-14",
  summary:
    "Besin zincirindeki ilişkileri kartlarla yapılandırtır.",
  curriculumMapping: {
    code: "FB.7.7.1",
    canonicalText: "Besin zincirindeki canlılar arasındaki ilişkileri yapılandırabilme",
    gradeLevel: 7,
    unit: "Sürdürülebilir Yaşam Ve Enerji",
    unitOrder: 7,
    source: { ...TYMM, url: "https://tymm.meb.gov.tr/fen-bilimleri-dersi/unite/434", reference: "7. Sınıf > 7. Ünite > FB.7.7.1" },
    verification: "unverified",
  },
  title: "Besin Zinciri: Kim Kimi Besliyor?",
  baseStages: {
    engage: {
      title: "Bu canlılar birbirine nasıl bağlı?",
      teacherAction: "Dört canlının adını karışık sırayla yazar ve aralarındaki bağı sorar.",
      studentAction: "Canlıları beslenme ilişkisine göre sıralamayı dener ve gerekçesini yazar.",
      evidence: "Öğrenci, canlılar arasında yönlü bir beslenme ilişkisi kurar.",
      objectiveConnection: "Zincirin yapılandırılacağı ön bilgiyi ortaya çıkarır.",
      materials: ["paper", "pencil"],
    },
    explore: {
      title: "Kartlarla zincir kur",
      teacherAction: "Canlı kartlarını ve oklu bağlantı şeritlerini dağıtır; enerji akış yönü kuralını açıklar.",
      studentAction: "Kartları keser, iki farklı besin zinciri kurar ve okların yönünü işaretler.",
      evidence: "Öğrenci, iki zinciri doğru sıra ve doğru ok yönüyle kurar.",
      objectiveConnection: "Kazanımın istediği yapılandırma somut ürüne dönüşür.",
      materials: ["paper", "pencil", "scissors"],
    },
    explain: {
      title: "Üretici, tüketici, ayrıştırıcı",
      teacherAction: "Grup zincirleri üzerinden üretici, tüketici ve ayrıştırıcı rollerini adlandırır.",
      studentAction: "Kurduğu zincirdeki her canlıyı rolüyle etiketler.",
      evidence: "Öğrenci, zincirdeki rolleri doğru adlandırır.",
      objectiveConnection: "Yapılandırma, kazanımın kavram diline bağlanır.",
      materials: ["paper", "pencil"],
    },
    elaborate: {
      title: "Bir halka çıkarsa ne olur?",
      teacherAction: "Zincirden bir canlıyı çıkaran üç senaryo kartı verir.",
      studentAction: "Her senaryoda zincirin nasıl etkileneceğini gerekçesiyle yazar.",
      evidence: "Öğrenci, bir halkanın kaybının zincire etkisini nedenselleştirir.",
      objectiveConnection: "İlişkiler, bozulma senaryosuyla sınanır.",
      materials: ["paper", "pencil"],
    },
    evaluate: {
      title: "Kendi zincirin",
      teacherAction: "Boş zincir şeması dağıtır ve ölçütlerle kontrol eder.",
      studentAction: "Kendi seçtiği canlılarla bir besin zinciri kurar, rolleri etiketler ve ok yönünü yazar.",
      evidence: "Öğrenci, zincir, rol ve yön bilgisini eksiksiz üretir.",
      objectiveConnection: "Kazanım, bireysel yapılandırma ürünü üzerinden ölçülür.",
      materials: ["paper", "pencil"],
    },
  },
  routes: [
    {
      id: "food-chain-poster",
      name: "Fon kartonuna besin ağı posteri",
      tier: "classroom",
      adaptationSummary: "Fon kartonu ve renkli kalemlerle grup posteri hazırlanarak zincirler ağa genişletilir.",
      eligibility: { requiredMaterials: ["poster-board", "colored-pencils"] },
      materials: [
        { materialId: "poster-board", basis: "group", quantity: 1 },
        { materialId: "colored-pencils", basis: "group", quantity: 1 },
        { materialId: "paper", basis: "group", quantity: 3 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "scissors", basis: "group", quantity: 1 },
      ],
      stageOverrides: {
        elaborate: {
          title: "Zincirden ağa",
          teacherAction: "İki grubun zincirini birleştirerek besin ağı posteri hazırlama görevini verir.",
          studentAction: "Zincirleri fon kartonunda birleştirir, ortak canlıları renkle işaretler ve ağı sunar.",
          materials: ["poster-board", "colored-pencils", "paper", "pencil"],
        },
      },
    },
    {
      id: "food-chain-cards",
      name: "Kâğıt kartlarla besin zinciri",
      tier: "minimal",
      adaptationSummary: "Kâğıt kartlarla kurulan zincir; yalnızca kırtasiye ile yürütülür.",
      eligibility: {},
      materials: [
        { materialId: "paper", basis: "group", quantity: 4 },
        { materialId: "pencil", basis: "student", quantity: 1 },
        { materialId: "scissors", basis: "group", quantity: 1 },
      ],
      substitutionNote: "Poster yerine masa üstü kart zinciri kullanıldı; yapılandırma çıktısı korundu.",
    },
  ],
};

export const CURRICULUM = {
  "space-age": SPACE_AGE,
  "force-and-energy": FORCE_AND_ENERGY,
  "body-systems": BODY_SYSTEMS,
  "light-and-lenses": LIGHT_AND_LENSES,
  "nature-of-matter": NATURE_OF_MATTER,
  electrification: ELECTRIFICATION,
  "sustainable-life": SUSTAINABLE_LIFE,
} as const satisfies Record<string, WorkshopTopic>;

export type OutcomeId = keyof typeof CURRICULUM;

export const OUTCOME_IDS = Object.keys(CURRICULUM) as [OutcomeId, ...OutcomeId[]];

/** The outcome the lab opens on until a teacher picks another. */
export const DEFAULT_OUTCOME_ID: OutcomeId = "electrification";

export function getOutcomeContent(id: OutcomeId): WorkshopTopic {
  return CURRICULUM[id];
}

export function isOutcomeId(value: string): value is OutcomeId {
  return Object.prototype.hasOwnProperty.call(CURRICULUM, value);
}

/** Every route in the corpus, for counters and matrix tests. */
export const ALL_ROUTES = OUTCOME_IDS.flatMap((outcomeId) =>
  CURRICULUM[outcomeId].routes.map((route) => ({ outcomeId, route })),
);
