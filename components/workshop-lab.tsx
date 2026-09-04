"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Eye,
  LockKeyhole,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Wifi,
  WifiOff,
  Zap,
  ZapOff,
} from "lucide-react";
import { MaterialLedger } from "@/components/material-ledger";
import { DEFAULT_PROFILE, validateProfile } from "@/server/domain/generator";
import { INVENTORY_PRESETS, INVENTORY_PRESET_IDS, MATERIAL_OPTIONS } from "@/server/content/materials";
import { CURRICULUM, OUTCOME_IDS } from "@/server/content/curriculum";
import { AGE_COHORTS, WORKSHOP_DOMAINS, WORKSHOP_DOMAIN_IDS } from "@/server/content/domains";
import {
  CENTRES,
  CENTRE_IDS,
  SCHOOL_CLASSROOM,
  VENUE_CAPABILITIES,
  VENUE_CAPABILITY_IDS,
  confirmedCapabilities,
  unpublishedCapabilities,
  type CentreId,
} from "@/server/content/venues";
import { FORMATS, FORMAT_IDS, getFormat } from "@/server/content/formats";
import type { MaterialKey, ResourceProfile, WorkshopPlan } from "@/server/domain/types";

type View = "configure" | "generating" | "result";

export function WorkshopLab({ live = false }: { live?: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<View>("configure");
  const [profile, setProfile] = useState<ResourceProfile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<WorkshopPlan | null>(null);
  // Issued by the server with the plan; the draft is saved by naming it.
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [activeStage, setActiveStage] = useState(0);
  const [venueId, setVenueId] = useState<string>("school");
  const selectedFormat = getFormat(profile.formatId);
  const selectedOutcome = CURRICULUM[(profile.outcomeId ?? OUTCOME_IDS[0]) as keyof typeof CURRICULUM];
  const profileFindings = validateProfile(profile);
  const profileBlocked = profileFindings.some((finding) => finding.severity === "blocker");

  function update<K extends keyof ResourceProfile>(key: K, value: ResourceProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function toggleMaterial(key: MaterialKey) {
    update(
      "materials",
      profile.materials.includes(key)
        ? profile.materials.filter((item) => item !== key)
        : [...profile.materials, key],
    );
  }

  async function createPlan() {
    if (profileBlocked) return;
    setGenerationError(null);
    setView("generating");
    try {
      const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 700));
      const responsePromise = fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const [response] = await Promise.all([responsePromise, minimumDelay]);
      const body = (await response.json()) as
        | { generationId: string; plan: WorkshopPlan }
        | { error: string };
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Atölye üretilemedi.");
      }
      setPlan(body.plan);
      setGenerationId(body.generationId);
      setIdempotencyKey(crypto.randomUUID());
      setView("result");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Atölye üretilemedi.");
      setView("configure");
    }
  }

  async function saveDraft() {
    if (!plan || !generationId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        // Only the conditions and the id of the generation being saved. The
        // prose lives server-side and is never sent back up.
        body: JSON.stringify({ ...plan.profile, generationId }),
      });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error ?? "Taslak kaydedilemedi.");
      router.push(`/workshops/${body.id}?created=1`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Taslak kaydedilemedi.");
      setSaving(false);
    }
  }

  if (view === "generating") return <GeneratingView />;
  if (view === "configure") {
    return (
      <section className="page lab-page">
        <div className="lab-heading">
          <div><span className="overline">Atölye laboratuvarı</span><h1>Koşulları tanımla</h1></div>
          <span className="mode-badge"><span /> {live ? "CANLI ÜRETİM · doğrulamalı" : "REPLAY · güvenli demo"}</span>
        </div>

        <div className="configuration-grid">
          <div className="form-stack">
            {generationError && <div className="error-notice" role="alert"><CircleAlert />{generationError}</div>}
            <section className="panel objective-panel">
              <div className="panel-kicker"><LockKeyhole size={17} /> 01 · Konu Kilidi</div>
              <label className="field-label" htmlFor="outcome-select">Atölye konusu</label>
              <select
                id="outcome-select"
                data-testid="outcome-select"
                className="outcome-select"
                value={profile.outcomeId ?? OUTCOME_IDS[0]}
                onChange={(event) => update("outcomeId", event.target.value)}
              >
                {WORKSHOP_DOMAIN_IDS.filter((domainId) =>
                  OUTCOME_IDS.some((id) => CURRICULUM[id].domainId === domainId),
                ).map((domainId) => (
                  <optgroup key={domainId} label={WORKSHOP_DOMAINS[domainId].label}>
                    {OUTCOME_IDS.filter((id) => CURRICULUM[id].domainId === domainId).map((id) => (
                      <option key={id} value={id}>
                        {CURRICULUM[id].title} · {AGE_COHORTS[CURRICULUM[id].cohort].label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="locked-select" data-testid="objective-lock-preview">
                <span><small>{WORKSHOP_DOMAINS[selectedOutcome.domainId].shortLabel}</small> {selectedOutcome.summary}</span>
                <LockKeyhole size={18} />
              </div>
              {selectedOutcome.curriculumMapping ? (
                <p className="panel-help" data-testid="curriculum-mapping">
                  Okul kazanımıyla tamamlayıcılık: <b>{selectedOutcome.curriculumMapping.code}</b> —{" "}
                  {selectedOutcome.curriculumMapping.canonicalText}
                  {selectedOutcome.curriculumMapping.verification === "unverified"
                    ? " · kaynaktan aktarıldı, uzman doğrulaması bekliyor"
                    : " · uzman tarafından doğrulandı"}
                </p>
              ) : (
                <p className="panel-help">Bu konu için okul kazanımı tamamlayıcılığı tanımlı değil.</p>
              )}
              <div className="inline-fields">
                <label><span>Yaş grubu</span><select defaultValue={selectedOutcome.cohort}><option>{AGE_COHORTS[selectedOutcome.cohort].label}</option></select></label>
                <label><span>Pedagoji iskeleti</span><select defaultValue="5e" data-testid="pedagogy-select"><option value="5e">5E Öğrenme Döngüsü (İMKÂN)</option></select></label>
              
              <p className="panel-help">
                5E, İMKÂN&apos;ın kullandığı aşama iskeletidir. Bilim Türkiye&apos;nin kendi
                yaklaşımı “Yaparak Yaşayarak Öğrenme” ve proje tabanlı çalışmadır; bu
                iskelet onun yerine geçmez, oturumu ölçülebilir aşamalara böler.
              </p>
            </div>
            </section>

            <section className="panel">
              <div className="panel-kicker"><Sparkles size={17} /> 02 · Gerçek sınıf koşulları</div>
              <div className="field-grid three">
                <label><span>Süre</span><select value={profile.durationMinutes} onChange={(event) => update("durationMinutes", Number(event.target.value) as 40 | 60 | 80)}><option value="40">40 dakika</option><option value="60">60 dakika</option><option value="80">80 dakika</option></select></label>
                <label><span>Öğrenci sayısı</span><input type="number" min="6" max="50" value={profile.classSize} onChange={(event) => update("classSize", Number(event.target.value))} /></label>
                <label><span>Grup büyüklüğü</span><select value={profile.groupSize} onChange={(event) => update("groupSize", Number(event.target.value))}><option value="3">3 öğrenci</option><option value="4">4 öğrenci</option><option value="5">5 öğrenci</option><option value="6">6 öğrenci</option></select></label>
              </div>
              {profileBlocked && <div className="field-error" role="alert"><CircleAlert /> {profileFindings.map((finding) => finding.message).join(" ")}</div>}
              <div className="toggle-row">
                <button data-testid="toggle-electricity" aria-label="Elektrik var" aria-pressed={profile.hasElectricity} className={profile.hasElectricity ? "toggle-card selected" : "toggle-card"} onClick={() => update("hasElectricity", !profile.hasElectricity)} type="button">{profile.hasElectricity ? <Zap /> : <ZapOff />}<span><strong>Elektrik</strong><small>{profile.hasElectricity ? "Var" : "Yok"}</small></span><i>{profile.hasElectricity && <Check />}</i></button>
                <button data-testid="toggle-internet" aria-label="İnternet var" aria-pressed={profile.hasInternet} className={profile.hasInternet ? "toggle-card selected" : "toggle-card"} onClick={() => update("hasInternet", !profile.hasInternet)} type="button">{profile.hasInternet ? <Wifi /> : <WifiOff />}<span><strong>İnternet</strong><small>{profile.hasInternet ? "Var" : "Yok"}</small></span><i>{profile.hasInternet && <Check />}</i></button>
              </div>
              <label className="field-label" htmlFor="format-select">Eğitim formatı</label>
              <select
                id="format-select"
                data-testid="format-select"
                className="outcome-select"
                value={profile.formatId ?? FORMAT_IDS[0]}
                onChange={(event) => update("formatId", event.target.value)}
              >
                {FORMAT_IDS.map((id) => (
                  <option key={id} value={id}>
                    {FORMATS[id].label}
                  </option>
                ))}
              </select>
              <p className="panel-help">
                {selectedFormat.description} Yayımlanmış oturum süresi{" "}
                {selectedFormat.standardSessionMinutes} dakikadır.
              </p>
              <label className="field-label" htmlFor="venue-select">Uygulama yeri</label>
              <select
                id="venue-select"
                data-testid="venue-select"
                className="outcome-select"
                value={venueId}
                onChange={(event) => {
                  const value = event.target.value;
                  setVenueId(value);
                  update(
                    "capabilities",
                    value === "school" ? [...SCHOOL_CLASSROOM.capabilities] : confirmedCapabilities(value as CentreId),
                  );
                }}
              >
                <option value="school">{SCHOOL_CLASSROOM.label}</option>
                <optgroup label="Bilim Türkiye merkezleri">
                  {CENTRE_IDS.map((id) => (
                    <option key={id} value={id}>
                      {CENTRES[id].name} · {CENTRES[id].location}
                    </option>
                  ))}
                </optgroup>
              </select>
              {venueId !== "school" && unpublishedCapabilities(venueId as CentreId).length > 0 && (
                <p className="panel-help" data-testid="unpublished-note">
                  Bu merkez için yayımlanmamış donanım:{" "}
                  {unpublishedCapabilities(venueId as CentreId)
                    .map((capability) => VENUE_CAPABILITIES[capability].label)
                    .join(", ")}
                  . Yayımlanmamış olması yok anlamına gelmez; merkezde varsa aşağıdan işaretleyin.
                </p>
              )}
              <div className="material-grid">
                {VENUE_CAPABILITY_IDS.map((capability) => {
                  const present = (profile.capabilities ?? []).includes(capability);
                  return (
                    <button
                      key={capability}
                      type="button"
                      data-testid={`capability-${capability}`}
                      aria-pressed={present}
                      title={VENUE_CAPABILITIES[capability].description}
                      className={present ? "material selected" : "material"}
                      onClick={() =>
                        update(
                          "capabilities",
                          present
                            ? (profile.capabilities ?? []).filter((item) => item !== capability)
                            : [...(profile.capabilities ?? []), capability],
                        )
                      }
                    >
                      <i>{present && <Check />}</i>
                      {VENUE_CAPABILITIES[capability].label}
                    </button>
                  );
                })}
              </div>
              <div className="budget-row">
                <label><span>Toplam bütçe</span><div className="input-affix"><input type="number" min="0" value={profile.budgetTry} onChange={(event) => update("budgetTry", Number(event.target.value))} /><b>₺</b></div></label>
                <label className="check-label"><input type="checkbox" checked={profile.hardBudget} onChange={(event) => update("hardBudget", event.target.checked)} /><span><strong>Kesin bütçe sınırı</strong><small>Aşım olursa üretimi durdur</small></span></label>
              </div>
            </section>

            <section className="panel">
              <div className="panel-kicker"><PackageCheck size={17} /> 03 · Mevcut malzemeler</div>
              <p className="panel-help">Oturumda gerçekten bulunanları seçin. Sistem yalnızca bunları veya onaylı alternatiflerini kullanır.</p>
              <div className="preset-row">
                {INVENTORY_PRESET_IDS.map((presetId) => {
                  const preset = INVENTORY_PRESETS[presetId];
                  const active =
                    preset.materials.length === profile.materials.length &&
                    preset.materials.every((materialId) => profile.materials.includes(materialId));
                  return (
                    <button
                      key={presetId}
                      type="button"
                      data-testid={`preset-${presetId}`}
                      aria-pressed={active}
                      className={active ? "preset active" : "preset"}
                      title={preset.description}
                      onClick={() => update("materials", [...preset.materials])}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="material-grid">
                {MATERIAL_OPTIONS.map((material) => (
                  <button key={material.key} data-testid={`material-${material.key}`} aria-pressed={profile.materials.includes(material.key)} type="button" className={profile.materials.includes(material.key) ? "material selected" : "material"} onClick={() => toggleMaterial(material.key)}>
                    <i>{profile.materials.includes(material.key) && <Check size={13} />}</i>{material.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="summary-panel">
            <span className="overline">Üretim özeti</span>
            <h2>Atölyenin sınırları</h2>
            <dl>
              <div><dt><Clock3 /> Süre</dt><dd>{profile.durationMinutes} dk</dd></div>
              <div><dt><Users /> Gruplar</dt><dd>{Math.ceil(profile.classSize / profile.groupSize)} × ~{profile.groupSize}</dd></div>
              <div><dt><WalletCards /> Bütçe</dt><dd>{profile.budgetTry} ₺</dd></div>
              <div><dt><PackageCheck /> Malzeme</dt><dd>{profile.materials.length} çeşit</dd></div>
            </dl>
            <div className="safety-note"><ShieldCheck /><div><strong>Güvenlik filtresi açık</strong><p>Yalnızca yaşa ve koşullara uygun, önceden onaylı etkinlik şablonları kullanılacak.</p></div></div>
            <button data-testid="generate-submit" className="button primary wide" type="button" disabled={profileBlocked} onClick={createPlan}>Atölyeyi üret <Sparkles size={18} /></button>
            <p className="microcopy">Kazanım metni üretim sırasında değiştirilemez.</p>
          </aside>
        </div>
      </section>
    );
  }

  if (!plan) {
    return null;
  }
  return <ResultView plan={plan} activeStage={activeStage} setActiveStage={setActiveStage} setView={setView} onSave={saveDraft} saving={saving} saveError={saveError} />;
}

function GeneratingView() {
  const steps = ["Kazanım sürümü kilitlendi", "Uyumsuz şablonlar elendi", "5E akışı dengelendi", "Güvenlik ve bütçe doğrulanıyor"];
  return (
    <section className="generation-screen" data-testid="generating-indicator" aria-live="polite">
      <div className="generator-orb"><Sparkles /><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div>
      <span className="overline">REPLAY üretim motoru</span>
      <h1>Atölye gerçek koşullara uyarlanıyor…</h1>
      <p>Aynı kazanımı koruyarak güvenli ve uygulanabilir bir rota oluşturuyoruz.</p>
      <div className="generation-steps">{steps.map((step, i) => <div className={i < 3 ? "done" : "working"} key={step}><i>{i < 3 ? <Check size={13} /> : <RefreshCcw size={13} />}</i><span>{step}</span></div>)}</div>
    </section>
  );
}

function ResultView({ plan, activeStage, setActiveStage, setView, onSave, saving, saveError }: { plan: WorkshopPlan; activeStage: number; setActiveStage: (value: number) => void; setView: (value: View) => void; onSave: () => void; saving: boolean; saveError: string | null }) {
  const blockers = useMemo(() => plan.findings.filter((finding) => finding.severity === "blocker"), [plan]);
  const stage = plan.stages[activeStage];
  const coveredStages = plan.stages.filter((item) => item.objectiveConnection.trim().length > 0).length;
  const safetyBlocked = plan.findings.some((finding) =>
    ["AGE_SAFETY_BOUND_VIOLATION", "HAZARD_OR_SUPERVISION_VIOLATION"].includes(finding.code),
  );

  return (
    <section className="page result-page" data-testid="plan-root">
      <div className="result-header no-print">
        <button className="back-link" onClick={() => setView("configure")}><ArrowLeft /> Koşulları düzenle</button>
        <div className="result-actions">
          <span className="mode-badge"><span /> {plan.mode}</span>
          <button data-testid="save-draft" className="button primary" disabled={blockers.length > 0 || saving} onClick={onSave}>{saving ? "Kaydediliyor…" : "Taslağı kaydet"} <ArrowRight size={17} /></button>
        </div>
      </div>
      {saveError && <div className="error-notice" role="alert"><CircleAlert /> {saveError}</div>}

      <header className="plan-title">
        <div><span className="overline">Fen bilimleri · 7. sınıf · 5E</span><h1>{plan.title}</h1><p>{plan.adaptationSummary}</p></div>
        <div className="plan-metrics"><div><Clock3 /><strong>{plan.profile.durationMinutes}</strong><span>dakika</span></div><div><Users /><strong>{plan.profile.classSize}</strong><span>öğrenci</span></div><div><WalletCards /><strong>{plan.estimatedCostTry} ₺</strong><span>tahmini</span></div></div>
      </header>

      <section className="objective-lock-card" data-testid="objective-lock">
        <div className="lock-symbol"><LockKeyhole /></div>
        <div><span className="overline">Konu Kilidi · {plan.objective.code}</span><blockquote>{plan.objective.canonicalText}</blockquote><small>{plan.objective.source}</small></div>
        <span className="verified"><ShieldCheck /> Doğrulandı</span>
      </section>

      <div className="plan-grid">
        <div>
          <div className="stage-tabs no-print" role="tablist">
            {plan.stages.map((item, index) => <button role="tab" aria-selected={index === activeStage} className={index === activeStage ? "active" : ""} onClick={() => setActiveStage(index)} key={item.key}><span>{index + 1}</span>{item.shortName}<small>{item.minutes} dk</small></button>)}
          </div>
          <article className="stage-detail" role="tabpanel" data-testid={`stage-detail-${stage.key}`}>
            <div className="stage-heading"><div><span className="stage-number">0{activeStage + 1}</span><span className="overline">{stage.name}</span><h2>{stage.title}</h2></div><span className="time-pill"><Clock3 /> {stage.minutes} dk</span></div>
            <div className="instruction-grid"><div><span className="tiny-heading">Eğitmen ne yapar?</span><p>{stage.teacherAction}</p></div><div><span className="tiny-heading">Öğrenci ne yapar?</span><p>{stage.studentAction}</p></div></div>
            <div className="evidence-box"><Eye /><div><strong>Beklenen öğrenme kanıtı</strong><p>{stage.evidence}</p></div></div>
            <div className="trace-line"><LockKeyhole /><div><strong>Konu bağlantısı</strong><p>{stage.objectiveConnection}</p></div></div>
          </article>
          <section className="all-stages print-only">
            {plan.stages.map((item, index) => <article key={item.key}><span>0{index + 1} · {item.minutes} dk</span><h3>{item.name}: {item.title}</h3><p><b>Eğitmen:</b> {item.teacherAction}</p><p><b>Öğrenci:</b> {item.studentAction}</p><p><b>Konu bağlantısı:</b> {item.objectiveConnection}</p><strong>Kanıt: {item.evidence}</strong></article>)}
          </section>
          <MaterialLedger plan={plan} />
        </div>

        <aside className="validation-panel">
          <div className="validation-title"><ShieldCheck /><div><span className="overline">Deterministik kontrol</span><h3>Uygulanabilirlik raporu</h3></div></div>
          <div className="check-list">
            <div>{coveredStages === plan.stages.length ? <CheckCircle2 /> : <CircleAlert />}<span><strong>Konu kapsama</strong><small>{coveredStages} / {plan.stages.length} aşama bağlı</small></span></div>
            <div>{plan.stages.reduce((sum, item) => sum + item.minutes, 0) === plan.profile.durationMinutes ? <CheckCircle2 /> : <CircleAlert />}<span><strong>Süre toplamı</strong><small>{plan.stages.reduce((sum, item) => sum + item.minutes, 0)} / {plan.profile.durationMinutes} dakika</small></span></div>
            <div><CheckCircle2 /><span><strong>Grup kapasitesi</strong><small>{plan.groupCount} grup planlandı</small></span></div>
            <div>{safetyBlocked ? <CircleAlert /> : <CheckCircle2 />}<span><strong>Güvenlik sınırları</strong><small>{safetyBlocked ? "İnceleme gerekli" : "İhlal yok"}</small></span></div>
          </div>
          {plan.findings.map((finding, index) => <div data-testid="finding" data-code={finding.code} data-severity={finding.severity} className={`finding ${finding.severity}`} key={`${finding.code}-${index}`}>{finding.severity === "warning" || finding.severity === "blocker" ? <CircleAlert /> : <Sparkles />}<div><strong>{finding.code.replaceAll("_", " ")}</strong><p>{finding.message}</p></div></div>)}
          <details><summary>Doğrulama kaydı <ChevronDown /></summary><code>OBJECTIVE_COVERAGE: {coveredStages === plan.stages.length ? "PASS" : "BLOCK"}<br />DURATION_TOTAL: {plan.stages.reduce((sum, item) => sum + item.minutes, 0) === plan.profile.durationMinutes ? "PASS" : "BLOCK"}<br />SAFETY_BOUNDS: {safetyBlocked ? "BLOCK" : "PASS"}<br />INVENTORY: {plan.findings.some((finding) => finding.code === "APPROVED_SUBSTITUTION_APPLIED") ? "ADAPTED" : "PASS"}</code></details>
        </aside>
      </div>

    </section>
  );
}
