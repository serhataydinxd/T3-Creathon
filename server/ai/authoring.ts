import "server-only";

import { z } from "zod";
import type { ResourceProfile, WorkshopPlan } from "@/server/domain/types";
import { MATERIALS } from "@/server/content/materials";
import { ProviderError, type LLMProvider } from "./provider";

const STAGE_KEYS = ["engage", "explore", "explain", "elaborate", "evaluate"] as const;

const sentence = z.string().trim().min(12).max(400);

export const authoredWorkshopSchema = z.object({
  title: z.string().trim().min(8).max(120),
  adaptationSummary: sentence,
  stages: z
    .array(
      z.object({
        key: z.enum(STAGE_KEYS),
        title: z.string().trim().min(6).max(120),
        teacherAction: sentence,
        studentAction: sentence,
        evidence: sentence,
        objectiveConnection: sentence,
      }),
    )
    .length(5)
    .refine(
      (stages) => new Set(stages.map((stage) => stage.key)).size === stages.length,
      "Her 5E aşaması yalnızca bir kez yer alabilir.",
    ),
});

export type AuthoredWorkshop = z.infer<typeof authoredWorkshopSchema>;

const SYSTEM_PROMPT = `Sen Bilim Türkiye bilim merkezlerinde 6-14 yaş grubuna uygulanan atölye eğitimlerinin içeriğini yazan bir eğitim tasarımcısısın.

Kurallar:
- Verilen atölye konusunu asla değiştirme, yeniden yorumlama veya genişletme.
- Yalnızca sana verilen 5E aşamalarının metnini yaz. Aşama sırası, süreleri ve malzemeleri sabittir; bunları değiştirme.
- Verilen malzeme listesinin dışında hiçbir malzeme, araç veya dijital kaynak önerme.
- Elektrik yoksa elektrik gerektiren hiçbir etkinlik yazma. İnternet yoksa video, simülasyon veya çevrimiçi kaynak önerme.
- Öğrenci güvenliğini riske atan hiçbir deney önerme.
- Her aşamada ölçülebilir bir öğrenme kanıtı belirt.
- Tüm metinler Türkçe ve eğitmenin doğrudan uygulayabileceği somut yönergeler olmalı.
- Atölyeyi yürüten kişiye "eğitmen", katılan çocuğa "öğrenci" de. "Öğretmen" veya "ders" kelimelerini kullanma; oturum ya da atölye eğitimi de.
- Her metin alanı TEK cümle olsun. Uzun anlatım yazma; kısa ve uygulanabilir yönerge ver.
- Her aşamanın "title" alanı 5E aşama adını TEKRAR ETMESİN. Öğrenciyi meraklandıran kısa bir soru ya da somut bir eylem ifadesi yaz (ör. "Aynı ampuller, neden farklı parlaklık?").
- "adaptationSummary" tek ve akıcı bir cümle olsun; koşulları maddeler hâlinde sıralama.
- Üst düzey "title" atölyenin adı olsun ve hiçbir aşama başlığıyla aynı olmasın.
- Yanıtın YALNIZCA geçerli bir JSON nesnesi olsun. Açıklama, başlık veya kod bloğu ekleme.`;

function buildUserPrompt(profile: ResourceProfile, skeleton: WorkshopPlan): string {
  const materialNames = profile.materials.map((key) => MATERIALS[key].label).join(", ") || "yok";
  const stageBrief = skeleton.stages
    .map(
      (stage) =>
        `- key: ${stage.key} | aşama: ${stage.name} | süre: ${stage.minutes} dk | kullanılabilir malzeme: ${stage.materialKeys
          .map((key) => MATERIALS[key].label)
          .join(", ")}`,
    )
    .join("\n");

  // A proposal has no approved session behind it, and saying so changes what
  // the model should write: a first draft for a pedagogue to mark up, not a
  // rendering of content someone already signed off.
  const brief =
    skeleton.topicStatus === "proposal"
      ? `Atölye konusu (değiştirilemez): ${skeleton.title}
Bu konu Bilim Türkiye kataloğunda yayımlanmıştır ancak onaylı bir oturum içeriği HENÜZ YOKTUR. Görevin, pedagog incelemesine girecek ilk taslağı yazmaktır.
Üst düzey "title" alanına kesinlikle bu konu adını yaz; yeni bir ad uydurma.`
      : `Kazanım (değiştirilemez): ${skeleton.objective.code} — ${skeleton.objective.canonicalText}`;

  return `${brief}

Sınıf koşulları:
- Süre: ${profile.durationMinutes} dakika
- Mevcut: ${profile.classSize} öğrenci, ${skeleton.groupCount} grup, grup büyüklüğü ${profile.groupSize}
- Elektrik: ${profile.hasElectricity ? "var" : "YOK"}
- İnternet: ${profile.hasInternet ? "var" : "YOK"}
- Bütçe: ${profile.budgetTry} TL${profile.hardBudget ? " (kesin sınır)" : ""}
- Kullanılabilir malzemeler: ${materialNames}
- Erişilebilirlik ihtiyaçları: ${profile.accessibilityNeeds.join("; ") || "belirtilmedi"}

Seçilen etkinlik rotası: ${skeleton.adaptationSummary}

Yazacağın aşamalar:
${stageBrief}

Şu şemada JSON döndür:
{"title":"string","adaptationSummary":"string","stages":[{"key":"engage|explore|explain|elaborate|evaluate","title":"string","teacherAction":"string","studentAction":"string","evidence":"string","objectiveConnection":"string"}]}`;
}

/**
 * Overlays authored prose onto the deterministic skeleton. Stage keys, minute
 * allocation, material quantities, cost and findings stay owned by code, so a
 * model can change how a workshop reads but never what it guarantees.
 */
export function mergeAuthoredWorkshop(
  skeleton: WorkshopPlan,
  authored: AuthoredWorkshop,
): WorkshopPlan {
  const byKey = new Map(authored.stages.map((stage) => [stage.key, stage]));
  const stages = skeleton.stages.map((stage) => {
    const written = byKey.get(stage.key);
    if (!written) return stage;
    return {
      ...stage,
      title: written.title,
      teacherAction: written.teacherAction,
      studentAction: written.studentAction,
      evidence: written.evidence,
      objectiveConnection: written.objectiveConnection,
    };
  });
  return {
    ...skeleton,
    mode: "LIVE",
    // A proposal's title is the catalogue topic name, which is the one thing
    // it locks. The model writes the session; it does not get to rename the
    // workshop Bilim Türkiye publishes.
    title: skeleton.topicStatus === "proposal" ? skeleton.title : authored.title,
    adaptationSummary: authored.adaptationSummary,
    stages,
  };
}

export async function authorWorkshop(
  provider: LLMProvider,
  profile: ResourceProfile,
  skeleton: WorkshopPlan,
  timeoutMs: number,
): Promise<WorkshopPlan> {
  const result = await provider.generate({
    schema: authoredWorkshopSchema,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(profile, skeleton),
    timeoutMs,
    maxOutputTokens: 6000,
  });
  const merged = mergeAuthoredWorkshop(skeleton, result.value);
  if (merged.stages.some((stage) => stage.objectiveConnection.trim().length === 0)) {
    throw new ProviderError("SCHEMA_MISMATCH", "A stage lost its objective connection.");
  }
  return merged;
}
