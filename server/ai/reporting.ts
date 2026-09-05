import "server-only";

import { z } from "zod";
import { MATERIALS } from "@/server/content/materials";
import { NOT_STATED, type ReportNarrative } from "@/server/domain/reports";
import type { WorkshopPlan } from "@/server/domain/types";
import { ProviderError, type LLMProvider } from "./provider";

/**
 * The report narrative, written from what the educator recorded and nothing
 * else.
 *
 * This is the place in the product where a model is most tempted to be
 * helpful and most damaging if it is: a plausible participant count, a stage
 * described as delivered because the others were, a learning claim with no
 * observation behind it. So the prompt forbids each of those by name, the
 * schema refuses empty sections, and every unanswered field is handed to the
 * model already filled with "Belirtilmedi." — the model's job is to narrate
 * the record, not to complete it.
 */
const section = z.string().trim().min(15).max(900);

export const reportNarrativeSchema = z.object({
  summary: section,
  delivery: section,
  learning: section,
  materials: section,
  accessibility: section,
  safety: section,
  nextTime: section,
});

const SYSTEM_PROMPT = `Sen bir Bilim Türkiye eğitmeninin doldurduğu uygulama kaydından rapor metni yazan bir eğitim editörüsün.

Mutlak kurallar:
- YALNIZCA sana verilen kayıttaki bilgileri kullan. Hiçbir sayı, süre, maliyet, katılımcı sayısı veya gözlem uydurma.
- Kayıtta olmayan bir bilgi için "Belirtilmedi." yaz. Tahmin yürütme, boşluk doldurma.
- Uygulanmamış veya atlanmış bir aşamayı uygulanmış gibi anlatma; atlandıysa nedenini kayıttan aktar.
- Öğrenme kanıtı gözlenmediyse öğrenmenin gerçekleştiğini yazma.
- Güvenlik olayını, aksaklığı veya olumsuz gözlemi gizleme, yumuşatma veya atlama.
- Planlanan ile gerçekleşen farklıysa ikisini de yaz; farkı sakla.
- Çocukların adını, kimliğini veya bireysel verisini yazma; yalnızca toplu sayı kullan.
- Övgü dolu pazarlama dili kullanma; olgusal ve ölçülü yaz.
- Atölyeyi yürüten kişiye "eğitmen", katılan çocuğa "katılımcı" de.
- Tüm metin Türkçe olsun.
- Yanıtın YALNIZCA geçerli bir JSON nesnesi olsun.

Bölümler:
- summary: yönetici özeti, en fazla üç cümle.
- delivery: uygulama süreci, planlanan-gerçekleşen farkları ve aşama değişiklikleri.
- learning: gözlenen öğrenme kanıtları; gözlenmediyse bunu açıkça yaz.
- materials: gerçek malzeme kullanımı, alternatifler ve maliyet.
- accessibility: yalnızca erişilebilirlik uygulamaları. Güvenlik olayı YAZMA.
- safety: güvenlik gözlemi ve varsa olay. Bu bölüm yalnızca merkez içindir; olduğu gibi yaz, yumuşatma.
- nextTime: eğitmenin sonraki uygulama önerileri.`;

export type DeliveryFacts = {
  plan: WorkshopPlan;
  centreName: string | null;
  deliveredOn: string | null;
  actualParticipants: number | null;
  actualGroups: number | null;
  actualMinutes: number | null;
  actualCostTry: number | null;
  whatWorked: string | null;
  whatWasHard: string | null;
  accessibilityApplied: string | null;
  safetyObservation: string | null;
  incidentOccurred: boolean;
  nextTime: string | null;
  stages: { stageKey: string; outcome: string; note: string | null; evidenceObserved: string | null }[];
  materials: {
    materialId: string;
    plannedQuantity: number | null;
    actualQuantity: number | null;
    substituteMaterialId: string | null;
    note: string | null;
  }[];
};

/** "Belirtilmedi" rather than an omission, so the model sees the gap too. */
function value(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === "") return NOT_STATED;
  return String(input);
}

/**
 * The same marker without its full stop, for use inside a sentence.
 *
 * Splicing the terminated form mid-clause produced "merkezinde Belirtilmedi.
 * tarihinde uygulandı", which reads as a broken sentence rather than a missing
 * value.
 */
function inlineValue(input: string | number | null | undefined): string {
  const text = value(input);
  return text === NOT_STATED ? "belirtilmemiş" : text;
}

/** The Turkish stage name, so a report never shows a raw key like "evaluate". */
function stageName(plan: WorkshopPlan, stageKey: string): string {
  return plan.stages?.find((stage) => stage.key === stageKey)?.name ?? stageKey;
}

export function buildReportPrompt(facts: DeliveryFacts): string {
  const stageLines = facts.stages
    .map((stage) => {
      const planned = facts.plan.stages?.find((item) => item.key === stage.stageKey);
      return `- ${planned?.name ?? stage.stageKey}: ${stage.outcome} | neden: ${value(stage.note)} | gözlenen kanıt: ${value(stage.evidenceObserved)} | beklenen kanıt: ${value(planned?.evidence)}`;
    })
    .join("\n");

  const materialLines = facts.materials
    .map((line) => {
      const label = MATERIALS[line.materialId as keyof typeof MATERIALS]?.label ?? line.materialId;
      const substitute = line.substituteMaterialId
        ? MATERIALS[line.substituteMaterialId as keyof typeof MATERIALS]?.label ?? line.substituteMaterialId
        : null;
      return `- ${label}: planlanan ${value(line.plannedQuantity)}, kullanılan ${value(line.actualQuantity)}${substitute ? `, yerine: ${substitute}` : ""}${line.note ? ` (${line.note})` : ""}`;
    })
    .join("\n");

  return `Atölye: ${facts.plan.title}
Merkez: ${value(facts.centreName)}
Tarih: ${value(facts.deliveredOn)}

PLANLANAN (kaynak sürümden, değiştirilemez):
- Süre: ${facts.plan.profile.durationMinutes} dk
- Katılımcı: ${facts.plan.profile.classSize}, grup: ${facts.plan.groupCount}
- Tahmini maliyet: ${facts.plan.estimatedCostTry} TL

GERÇEKLEŞEN (eğitmenin kaydı):
- Süre: ${value(facts.actualMinutes)} dk
- Katılımcı: ${value(facts.actualParticipants)}, grup: ${value(facts.actualGroups)}
- Maliyet: ${value(facts.actualCostTry)} TL

AŞAMALAR:
${stageLines || NOT_STATED}

MALZEME:
${materialLines || NOT_STATED}

EĞİTMEN GÖZLEMLERİ:
- En iyi çalışan: ${value(facts.whatWorked)}
- Zorlanılan: ${value(facts.whatWasHard)}
- Erişilebilirlik uygulaması: ${value(facts.accessibilityApplied)}
- Güvenlik gözlemi: ${value(facts.safetyObservation)}
- Olay bildirildi mi: ${facts.incidentOccurred ? "EVET" : "Hayır"}
- Sonraki uygulama önerisi: ${value(facts.nextTime)}

Şu şemada JSON döndür:
{"summary":"string","delivery":"string","learning":"string","materials":"string","accessibility":"string","safety":"string","nextTime":"string"}`;
}

/**
 * A deterministic narrative built only from the record.
 *
 * Used when live generation is off or the provider fails, and it is the reason
 * a report is never blocked on a model: the facts are already written down, so
 * restating them is something code can do. It reads plainly, which is the
 * correct register for a record of what happened.
 */
/** Turkish wording for a stage outcome, so a report never shows an enum value. */
const OUTCOME_TEXT: Record<string, string> = {
  applied: "uygulandı",
  modified: "değiştirildi",
  skipped: "atlandı",
};

/** Avoids the doubled full stop when a sentence continues after a note. */
function stripPeriod(text: string): string {
  return text.replace(/\.\s*$/, "");
}

export function offlineNarrative(facts: DeliveryFacts): ReportNarrative {
  const planned = facts.plan;
  const changed = facts.stages.filter((stage) => stage.outcome !== "applied");
  const observed = facts.stages.filter((stage) => stage.evidenceObserved?.trim());
  const substitutions = facts.materials.filter((line) => line.substituteMaterialId);

  return {
    summary: `${planned.title} atölyesi ${inlineValue(facts.centreName)} merkezinde ${inlineValue(facts.deliveredOn)} tarihinde uygulandı. Planlanan ${planned.profile.classSize} katılımcıya karşılık ${inlineValue(facts.actualParticipants)} katılımcı kaydedildi.`,
    delivery: `Planlanan süre ${planned.profile.durationMinutes} dakika, gerçekleşen süre ${inlineValue(facts.actualMinutes)} dakika. ${
      changed.length === 0
        ? "Aşamaların tamamı planlandığı gibi uygulandı."
        : `${changed.length} aşama değiştirildi veya atlandı: ${changed
            .map(
              (stage) =>
                `${stageName(planned, stage.stageKey)} (${OUTCOME_TEXT[stage.outcome] ?? stage.outcome}) — ${stripPeriod(value(stage.note))}`,
            )
            .join("; ")}.`
    }`,
    learning:
      observed.length === 0
        ? "Gözlenen öğrenme kanıtı kaydedilmedi; bu raporda öğrenmenin gerçekleştiği ileri sürülemez."
        : observed
            .map((stage) => `${stageName(planned, stage.stageKey)}: ${stage.evidenceObserved}`)
            .join(" "),
    materials: `Gerçekleşen maliyet ${inlineValue(facts.actualCostTry)} TL (planlanan ${planned.estimatedCostTry} TL). ${
      substitutions.length === 0
        ? "Malzeme değişikliği bildirilmedi."
        : `Değiştirilen malzemeler: ${substitutions.map((line) => line.materialId).join(", ")}.`
    }`,
    accessibility: `Erişilebilirlik uygulaması: ${value(facts.accessibilityApplied)}`,
    safety: `Güvenlik gözlemi: ${value(facts.safetyObservation)}${facts.incidentOccurred ? " Bir olay bildirildi." : ""}`,
    nextTime: `${value(facts.nextTime)} En iyi çalışan bölüm: ${value(facts.whatWorked)} Zorlanılan bölüm: ${value(facts.whatWasHard)}`,
  };
}

export async function authorReport(
  provider: LLMProvider,
  facts: DeliveryFacts,
  timeoutMs: number,
): Promise<ReportNarrative> {
  const result = await provider.generate({
    schema: reportNarrativeSchema,
    system: SYSTEM_PROMPT,
    user: buildReportPrompt(facts),
    timeoutMs,
    maxOutputTokens: 4000,
  });
  // A model that answers with an empty section has not written a report.
  for (const [key, text] of Object.entries(result.value)) {
    if (!text.trim()) throw new ProviderError("SCHEMA_MISMATCH", `Empty report section: ${key}`);
  }
  return result.value;
}
