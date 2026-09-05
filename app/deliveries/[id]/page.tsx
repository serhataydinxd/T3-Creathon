import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleAlert, Clock3, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { getDelivery } from "@/server/domain/deliveries";
import { reportHistory, NARRATIVE_SECTIONS, type ReportNarrative } from "@/server/domain/reports";
import { MATERIALS } from "@/server/content/materials";
import { STAGE_IDENTITY, type StageKey } from "@/server/content/curriculum";
import {
  draftReportAction,
  editReportAction,
  publishReportAction,
  reviewReportAction,
  saveObservationsAction,
  submitReportAction,
} from "@/app/actions/deliveries";
import type { WorkshopPlan } from "@/server/domain/types";

export const metadata: Metadata = {
  title: "Uygulama raporu",
  robots: { index: false, follow: false },
};

const SECTION_LABEL: Record<keyof ReportNarrative, string> = {
  summary: "Yönetici özeti",
  delivery: "Uygulama süreci",
  learning: "Öğrenme kanıtları",
  materials: "Malzeme ve maliyet",
  accessibility: "Erişilebilirlik ve güvenlik",
  nextTime: "Sonraki uygulama",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  submitted: "İncelemede",
  changes_requested: "Değişiklik istendi",
  approved: "Onaylandı",
  published: "Kütüphanede",
  superseded: "Eski sürüm",
};

const OUTCOME_LABEL = { applied: "Uygulandı", modified: "Değiştirildi", skipped: "Atlandı" };

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  let delivery: Awaited<ReturnType<typeof getDelivery>>;
  try {
    delivery = await getDelivery(user, id);
  } catch {
    notFound();
  }

  const plan = delivery.record.planSnapshot as WorkshopPlan;
  const report = delivery.report;
  const history = await reportHistory(id);
  const narrative = (report?.narrative ?? null) as ReportNarrative | null;
  const isOwner = delivery.record.educatorId === user.id;
  const editable = !report || ["draft", "changes_requested"].includes(report.status);
  const canEdit = (isOwner || user.role === "manager") && editable;
  // A pedagogue reviews someone else's account of someone else's session.
  const canReview =
    ["pedagogue", "manager"].includes(user.role) &&
    report?.status === "submitted" &&
    delivery.record.educatorId !== user.id &&
    report.createdBy !== user.id;
  const canPublish = user.role === "manager" && report?.status === "approved";

  return (
    <AppShell user={user}>
      <section className="page">
        <header className="persisted-header">
          <div>
            <span className="overline">
              Uygulama raporu · {delivery.centreName ?? "Okul sınıfı"}
            </span>
            <h1>{plan.title}</h1>
            <p>
              Kaynak sürüm {delivery.versionNumber} · Uygulayan {delivery.educatorName}
            </p>
          </div>
          <div className="header-tags">
            <span className="workflow-status" data-testid="report-status" data-status={report?.status ?? "none"}>
              {report ? STATUS_LABEL[report.status] : "Rapor yok"}
            </span>
          </div>
        </header>

        {/*
          * Planned and actual side by side. The comparison is the substance of
          * the report — 24 expected against 21 present says something no
          * single figure does — so the two are never merged into one column.
          */}
        <section className="compare-grid" data-testid="planned-vs-actual">
          <div>
            <span className="overline">Planlanan</span>
            <dl>
              <div><dt><Clock3 /> Süre</dt><dd>{plan.profile.durationMinutes} dk</dd></div>
              <div><dt><Users /> Katılımcı</dt><dd>{plan.profile.classSize} · {plan.groupCount} grup</dd></div>
              <div><dt><WalletCards /> Maliyet</dt><dd>{plan.estimatedCostTry} ₺</dd></div>
            </dl>
          </div>
          <div>
            <span className="overline">Gerçekleşen</span>
            <dl>
              <div><dt><Clock3 /> Süre</dt><dd data-testid="actual-minutes">{delivery.record.actualMinutes ?? "—"} dk</dd></div>
              <div><dt><Users /> Katılımcı</dt><dd data-testid="actual-participants">{delivery.record.actualParticipants ?? "—"} · {delivery.record.actualGroups ?? "—"} grup</dd></div>
              <div><dt><WalletCards /> Maliyet</dt><dd>{delivery.record.actualCostTry ?? "—"} ₺</dd></div>
            </dl>
          </div>
        </section>

        {canEdit && (
          <form action={saveObservationsAction} className="panel delivery-form" data-testid="observation-form">
            <input type="hidden" name="deliveryId" value={id} />
            <div className="panel-kicker">Gerçekleşen uygulama</div>
            <div className="field-grid three">
              <label><span>Tarih</span><input type="date" name="deliveredOn" defaultValue={delivery.record.deliveredOn ?? ""} data-testid="delivered-on" /></label>
              <label><span>Katılımcı</span><input type="number" min="0" name="actualParticipants" defaultValue={delivery.record.actualParticipants ?? ""} data-testid="input-participants" /></label>
              <label><span>Grup</span><input type="number" min="0" name="actualGroups" defaultValue={delivery.record.actualGroups ?? ""} /></label>
              <label><span>Süre (dk)</span><input type="number" min="0" name="actualMinutes" defaultValue={delivery.record.actualMinutes ?? ""} data-testid="input-minutes" /></label>
              <label><span>Maliyet (₺)</span><input type="number" min="0" name="actualCostTry" defaultValue={delivery.record.actualCostTry ?? ""} /></label>
              <label>
                <span>Paylaşım</span>
                <select name="visibility" defaultValue={delivery.record.visibility} data-testid="visibility-select">
                  <option value="private">Yalnızca ben</option>
                  <option value="centre">Merkezim</option>
                  <option value="public">Kütüphanede paylaşılabilir</option>
                </select>
              </label>
            </div>

            <div className="panel-kicker">Aşamalar</div>
            <div className="delivery-stages">
              {delivery.stages.map((stage) => {
                const planned = plan.stages?.find((item) => item.key === stage.stageKey);
                return (
                  <div className="delivery-stage" key={stage.stageKey}>
                    <input type="hidden" name="stageKey" value={stage.stageKey} />
                    <strong>{STAGE_IDENTITY[stage.stageKey as StageKey]?.name ?? stage.stageKey}</strong>
                    <small>{planned?.title}</small>
                    <label>
                      <span className="visually-hidden">{`${stage.stageKey} durumu`}</span>
                      <select name="stageOutcome" defaultValue={stage.outcome} data-testid={`stage-outcome-${stage.stageKey}`}>
                        {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <input name="stageNote" placeholder="Değiştiyse nedeni" defaultValue={stage.note ?? ""} data-testid={`stage-note-${stage.stageKey}`} />
                    <input name="stageEvidence" placeholder="Gözlenen kanıt" defaultValue={stage.evidenceObserved ?? ""} data-testid={`stage-evidence-${stage.stageKey}`} />
                  </div>
                );
              })}
            </div>

            <div className="panel-kicker">Malzeme</div>
            <div className="delivery-stages">
              {delivery.materials.map((line) => (
                <div className="delivery-stage" key={line.materialId}>
                  <input type="hidden" name="materialId" value={line.materialId} />
                  <strong>{MATERIALS[line.materialId as keyof typeof MATERIALS]?.label ?? line.materialId}</strong>
                  <small>Planlanan {line.plannedQuantity ?? "—"}</small>
                  <label>
                    <span className="visually-hidden">{`${line.materialId} kullanılan miktar`}</span>
                    <input type="number" min="0" name="materialActual" placeholder="kullanılan" defaultValue={line.actualQuantity ?? ""} data-testid={`material-actual-${line.materialId}`} />
                  </label>
                  <label>
                    <span className="visually-hidden">{`${line.materialId} yerine kullanılan`}</span>
                    <select name="materialSubstitute" defaultValue={line.substituteMaterialId ?? ""}>
                      <option value="">Yerine kullanılan yok</option>
                      {Object.entries(MATERIALS).map(([key, material]) => (
                        <option key={key} value={key}>{material.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ))}
            </div>

            <div className="panel-kicker">Gözlemler</div>
            <label className="field-label" htmlFor="worked">En iyi çalışan bölüm</label>
            <textarea id="worked" name="whatWorked" rows={2} className="evidence-input" defaultValue={delivery.record.whatWorked ?? ""} data-testid="input-worked" />
            <label className="field-label" htmlFor="hard">Zorlanılan bölüm</label>
            <textarea id="hard" name="whatWasHard" rows={2} className="evidence-input" defaultValue={delivery.record.whatWasHard ?? ""} />
            <label className="field-label" htmlFor="access">Erişilebilirlik uygulaması</label>
            <textarea id="access" name="accessibilityApplied" rows={2} className="evidence-input" defaultValue={delivery.record.accessibilityApplied ?? ""} />
            <label className="field-label" htmlFor="safety">Güvenlik gözlemi</label>
            <textarea id="safety" name="safetyObservation" rows={2} className="evidence-input" defaultValue={delivery.record.safetyObservation ?? ""} data-testid="input-safety" />
            <label className="check-label">
              <input type="checkbox" name="incidentOccurred" defaultChecked={delivery.record.incidentOccurred} data-testid="incident-check" />
              <span><strong>Bir olay yaşandı</strong><small>Rapora aynen aktarılır, gizlenmez</small></span>
            </label>
            <label className="field-label" htmlFor="next">Sonraki uygulama önerisi</label>
            <textarea id="next" name="nextTime" rows={2} className="evidence-input" defaultValue={delivery.record.nextTime ?? ""} />
            <p className="panel-help">
              Çocuk adı, kimliği veya bireysel verisi girmeyin. Katılım bilgisi yalnızca toplu
              sayı olarak kaydedilir.
            </p>
            <button className="button primary" type="submit" data-testid="save-observations">Kaydet</button>
          </form>
        )}

        <section className="panel">
          <div className="panel-kicker">Rapor</div>
          {!narrative ? (
            <div className="empty-state" data-testid="report-empty">
              <h3>Henüz rapor taslağı yok.</h3>
              <p>Kaydettiğiniz bilgilerden bir taslak üretilir; metni düzenleyip incelemeye gönderirsiniz.</p>
            </div>
          ) : (
            <form action={editReportAction} data-testid="report-form">
              <input type="hidden" name="deliveryId" value={id} />
              {NARRATIVE_SECTIONS.map((key) => (
                <div key={key}>
                  <label className="field-label" htmlFor={`section-${key}`}>{SECTION_LABEL[key]}</label>
                  <textarea
                    id={`section-${key}`}
                    name={key}
                    rows={3}
                    className="evidence-input"
                    defaultValue={narrative[key]}
                    readOnly={!canEdit}
                    data-testid={`section-${key}`}
                  />
                </div>
              ))}
              {canEdit && <button className="button" type="submit" data-testid="save-report">Metni kaydet</button>}
            </form>
          )}

          <div className="review-actions">
            {canEdit && (
              <form action={draftReportAction}>
                <input type="hidden" name="deliveryId" value={id} />
                <button className="button primary" type="submit" data-testid="draft-report">
                  {narrative ? "Taslağı yeniden üret" : "Rapor taslağı üret"}
                </button>
              </form>
            )}
            {canEdit && narrative && (
              <form action={submitReportAction}>
                <input type="hidden" name="deliveryId" value={id} />
                <button className="button primary" type="submit" data-testid="submit-report">İncelemeye gönder</button>
              </form>
            )}
            {canReview && (
              <form action={reviewReportAction} className="review-decision">
                <input type="hidden" name="deliveryId" value={id} />
                <label className="visually-hidden" htmlFor="review-note">İnceleme notu</label>
                <input id="review-note" name="note" placeholder="İnceleme notu" />
                <button className="button" type="submit" name="decision" value="changes_requested" data-testid="request-changes">
                  Değişiklik iste
                </button>
                <button className="button primary" type="submit" name="decision" value="approved" data-testid="approve-report">
                  Onayla
                </button>
              </form>
            )}
            {canPublish && (
              <form action={publishReportAction}>
                <input type="hidden" name="deliveryId" value={id} />
                <button className="button primary" type="submit" data-testid="publish-report">Kütüphanede yayımla</button>
              </form>
            )}
          </div>

          {report?.status === "submitted" && delivery.record.educatorId === user.id && (
            <p className="panel-help" data-testid="self-review-note">
              <CircleAlert size={13} /> Kendi uygulamanızın raporunu siz onaylayamazsınız; farklı
              bir pedagog incelemelidir.
            </p>
          )}

          {history.length > 1 && (
            <details data-testid="report-history">
              <summary>Rapor sürümleri ({history.length})</summary>
              <ul>
                {history.map((entry) => (
                  <li key={entry.id}>
                    Sürüm {entry.version} · {STATUS_LABEL[entry.status]} ·{" "}
                    {entry.mode === "live" ? `yapay zekâ (${entry.providerModel ?? "model"})` : "kayıttan"}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </section>
    </AppShell>
  );
}
