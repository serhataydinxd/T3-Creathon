"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
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
import { planContext } from "@/components/plan-context";
import { ObjectiveLockBadge } from "@/components/objective-lock-badge";
import { RouteDecisions } from "@/components/route-decisions";
import { DEFAULT_PROFILE, validateProfile } from "@/server/domain/generator";
import {
  INVENTORY_PRESETS,
  INVENTORY_PRESET_IDS,
  MATERIALS,
  MATERIAL_OPTIONS,
} from "@/server/content/materials";
import {
  AUTHORED_BY_CATALOGUE_ENTRY,
  CURRICULUM,
  OUTCOME_IDS,
  UNLISTED_OUTCOME_IDS,
} from "@/server/content/curriculum";
import { catalogueEntriesFor, getCatalogueEntry } from "@/server/content/catalogue";
import { AGE_COHORTS, AGE_COHORT_IDS, WORKSHOP_DOMAINS, WORKSHOP_DOMAIN_IDS } from "@/server/content/domains";
import {
  CENTRES,
  CENTRE_IDS,
  SCHOOL_CLASSROOM,
  VENUE_CAPABILITIES,
  VENUE_CAPABILITY_IDS,
  confirmedCapabilities,
  unavailableCapabilities,
  type CentreId,
} from "@/server/content/venues";
import { FORMATS, FORMAT_IDS, getFormat } from "@/server/content/formats";
import { isOutcomeId } from "@/server/content/curriculum";
import type { AgeCohortId, WorkshopDomainId } from "@/server/content/domains";
import type { MaterialKey, ResourceProfile, WorkshopPlan } from "@/server/domain/types";

type View = "configure" | "generating" | "result";

type CapabilityChoice = "available" | "unavailable" | "unknown";

/**
 * The three answers, in the order a trainer thinks in. "Bilinmiyor" is offered
 * explicitly and is the default, so leaving it is a recorded answer rather
 * than an omission the system reads as "no".
 */
/**
 * The wizard's steps.
 *
 * Grouped by the question each answers rather than by which part of the code
 * consumes them: a trainer thinks "what am I teaching", "where", "with what",
 * "under what constraints". Every field keeps a safe default, so the steps
 * guide rather than gate — generation stays available throughout.
 */
const STEPS = [
  { id: "topic", label: "Konu" },
  { id: "conditions", label: "Mekân ve koşullar" },
  { id: "materials", label: "Malzeme" },
  { id: "delivery", label: "Bütçe ve hazırlık" },
] as const;

/** Offered rather than free text, so the same need reads the same way twice. */
const ACCESSIBILITY_NEEDS = [
  "Yüksek kontrastlı basılı materyal",
  "Büyük punto yönerge kartı",
  "Sözlü yönerge alternatifi",
  "Tekerlekli sandalye erişimi",
  "Sessiz çalışma alanı",
] as const;

const CAPABILITY_CHOICES: readonly { value: CapabilityChoice; label: string }[] = [
  { value: "available", label: "Var" },
  { value: "unavailable", label: "Yok" },
  { value: "unknown", label: "Bilinmiyor" },
];

export function WorkshopLab({
  live = false,
  centreStatuses = {},
}: {
  live?: boolean;
  /**
   * Live facility status per centre, from the operational record. Defaulted to
   * empty rather than required so the component still renders in isolation;
   * an absent centre simply falls back to the published research.
   */
  centreStatuses?: Record<string, Record<string, CapabilityChoice>>;
}) {
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
  const [step, setStep] = useState(0);
  const selectedFormat = getFormat(profile.formatId);
  // The lab opens on the catalogue tab holding whatever topic is selected, so
  // the trainer lands where their default topic actually lives.
  const defaultEntry = CURRICULUM[(profile.outcomeId ?? OUTCOME_IDS[0]) as keyof typeof CURRICULUM];
  const [domainId, setDomainId] = useState<WorkshopDomainId>(defaultEntry.domainId);
  const [cohort, setCohort] = useState<AgeCohortId>(defaultEntry.cohort);
  const proposalEntry = profile.proposalEntryId ? getCatalogueEntry(profile.proposalEntryId) : null;
  const selectedOutcome = CURRICULUM[(profile.outcomeId ?? OUTCOME_IDS[0]) as keyof typeof CURRICULUM];
  const isProposal = proposalEntry !== null;
  const catalogueEntries = catalogueEntriesFor(domainId, cohort);
  // Derived from the profile rather than the research file, so the note agrees
  // with what the plan will actually do — including after a verification.
  const unsettledCapabilities = VENUE_CAPABILITY_IDS.filter(
    (capability) => capabilityStatus(profile, capability) === "unknown",
  );
  const authoredHere = catalogueEntries.filter((entry) =>
    AUTHORED_BY_CATALOGUE_ENTRY.has(entry.id),
  ).length;

  /**
   * Selecting a topic sets exactly one of the two identifiers, never both: a
   * catalogue entry İMKÂN has authored resolves to its corpus outcome, and any
   * other entry becomes a proposal for the assistant to draft.
   */
  function selectTopic(value: string) {
    const authored = AUTHORED_BY_CATALOGUE_ENTRY.get(value);
    setProfile((current) => ({
      ...current,
      outcomeId: authored ?? (isOutcomeId(value) ? value : current.outcomeId),
      proposalEntryId: authored || isOutcomeId(value) ? undefined : value,
    }));
  }

  const selectedTopicValue = proposalEntry
    ? proposalEntry.id
    : selectedOutcome.catalogueEntryId ?? (profile.outcomeId ?? OUTCOME_IDS[0]);
  const profileFindings = validateProfile(profile);
  const profileBlocked = profileFindings.some((finding) => finding.severity === "blocker");

  function update<K extends keyof ResourceProfile>(key: K, value: ResourceProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  /**
   * A facility's status as the profile records it. Absent from both lists is
   * not "no" — it is the honest third answer, and it is the default.
   */
  function capabilityStatus(current: ResourceProfile, capability: string): CapabilityChoice {
    if ((current.capabilities ?? []).includes(capability)) return "available";
    if ((current.unavailableCapabilities ?? []).includes(capability)) return "unavailable";
    return "unknown";
  }

  function setCapabilityStatus(capability: string, status: CapabilityChoice) {
    setProfile((current) => ({
      ...current,
      // Removed from both lists first, so a facility can never end up asserted
      // as present and absent at once — which the request schema also refuses.
      capabilities: [
        ...(current.capabilities ?? []).filter((item) => item !== capability),
        ...(status === "available" ? [capability] : []),
      ],
      unavailableCapabilities: [
        ...(current.unavailableCapabilities ?? []).filter((item) => item !== capability),
        ...(status === "unavailable" ? [capability] : []),
      ],
    }));
  }

  /**
   * Records how many of a material the venue holds. An empty box means "not
   * counted", which is different from zero and must not become it — so the key
   * is removed rather than set to 0.
   */
  function setStock(key: MaterialKey, raw: string) {
    setProfile((current) => {
      const next = { ...(current.materialStock ?? {}) };
      if (raw.trim() === "") delete next[key];
      else next[key] = Math.max(0, Math.floor(Number(raw)));
      return { ...current, materialStock: next };
    });
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

  if (view === "generating") return <GeneratingView live={live} proposal={isProposal} />;
  if (view === "configure") {
    return (
      <section className="page lab-page">
        <div className="lab-heading">
          <div><span className="overline">Atölye laboratuvarı</span><h1>Koşulları tanımla</h1></div>
          <span className="mode-badge"><span /> {live ? "CANLI ÜRETİM · doğrulamalı" : "REPLAY · güvenli demo"}</span>
        </div>

        <nav className="wizard-steps" aria-label="Üretim adımları">
          <ol>
            {STEPS.map((entry, index) => (
              <li key={entry.id}>
                <button
                  type="button"
                  data-testid={`step-button-${entry.id}`}
                  aria-current={index === step ? "step" : undefined}
                  className={index === step ? "current" : index < step ? "done" : ""}
                  onClick={() => setStep(index)}
                >
                  <span>{index + 1}</span>
                  {entry.label}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="configuration-grid">
          <div className="form-stack">
            {generationError && <div className="error-notice" role="alert"><CircleAlert />{generationError}</div>}
            <section className="panel objective-panel" hidden={step !== 0} data-testid="step-topic">
              <div className="panel-kicker"><LockKeyhole size={17} /> 01 · Konu Kilidi</div>
              <p className="panel-help">
                Konu listesi Bilim Türkiye&apos;nin yayımlanmış atölye kataloğudur. İMKÂN&apos;ın
                onaylı içeriği olan konular doğrudan uyarlanır; olmayanlar için pedagog
                incelemesine girecek bir taslak önerilir.
              </p>
              <div className="inline-fields">
                <label>
                  <span>Atölye teması</span>
                  <select
                    data-testid="domain-select"
                    value={domainId}
                    onChange={(event) => setDomainId(event.target.value as WorkshopDomainId)}
                  >
                    {WORKSHOP_DOMAIN_IDS.map((id) => (
                      <option key={id} value={id}>{WORKSHOP_DOMAINS[id].label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Yaş grubu</span>
                  <select
                    data-testid="cohort-select"
                    value={cohort}
                    onChange={(event) => setCohort(event.target.value as AgeCohortId)}
                  >
                    {AGE_COHORT_IDS.map((id) => (
                      <option key={id} value={id}>{AGE_COHORTS[id].label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field-label" htmlFor="outcome-select">Atölye konusu</label>
              <select
                id="outcome-select"
                data-testid="outcome-select"
                className="outcome-select"
                value={selectedTopicValue}
                onChange={(event) => selectTopic(event.target.value)}
              >
                <optgroup label={`${WORKSHOP_DOMAINS[domainId].shortLabel} · ${AGE_COHORTS[cohort].label} · ${catalogueEntries.length} konu`}>
                  {catalogueEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                      {AUTHORED_BY_CATALOGUE_ENTRY.has(entry.id)
                        ? " · onaylı içerik"
                        : " · taslak önerilecek"}
                    </option>
                  ))}
                </optgroup>
                {UNLISTED_OUTCOME_IDS.length > 0 && (
                  <optgroup label="İMKÂN içeriği · katalogda listelenmiyor">
                    {UNLISTED_OUTCOME_IDS.map((id) => (
                      <option key={id} value={id}>
                        {CURRICULUM[id].title} · {AGE_COHORTS[CURRICULUM[id].cohort].label}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="locked-select" data-testid="objective-lock-preview">
                <span>
                  <small>
                    {isProposal
                      ? `${WORKSHOP_DOMAINS[proposalEntry.domainId].shortLabel} · TASLAK`
                      : WORKSHOP_DOMAINS[selectedOutcome.domainId].shortLabel}
                  </small>
                  {isProposal
                    ? `${proposalEntry.title} — katalogda yayımlanmış, onaylı içeriği henüz yok.`
                    : selectedOutcome.summary}
                </span>
                <LockKeyhole size={18} />
              </div>
              {isProposal ? (
                <p className="panel-help" data-testid="proposal-notice">
                  İMKÂN bu konu için bir <b>taslak öneri</b> üretir. Oturum, pedagog onayı
                  alana kadar uygulanmamalıdır; onaylandığında korpusa onaylı içerik olarak
                  girer.
                </p>
              ) : selectedOutcome.curriculumMapping ? (
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
              <p className="panel-help" data-testid="catalogue-coverage">
                Bu sekmede {catalogueEntries.length} yayımlanmış konu var; {authoredHere} tanesinin
                İMKÂN&apos;da onaylı içeriği bulunuyor.
              </p>
              <div className="inline-fields">
                <label><span>Pedagoji iskeleti</span><select defaultValue="5e" data-testid="pedagogy-select"><option value="5e">5E Öğrenme Döngüsü (İMKÂN)</option></select></label>
              </div>
              <p className="panel-help">
                5E, İMKÂN&apos;ın kullandığı aşama iskeletidir. Bilim Türkiye&apos;nin kendi
                yaklaşımı “Yaparak Yaşayarak Öğrenme” ve proje tabanlı çalışmadır; bu
                iskelet onun yerine geçmez, oturumu ölçülebilir aşamalara böler.
              </p>
            </section>

            <section className="panel" hidden={step !== 1} data-testid="step-conditions">
              <div className="panel-kicker"><Sparkles size={17} /> 02 · Mekân ve koşullar</div>
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
                  // Only what a source actually establishes. A centre's
                  // unpublished facility stays unknown; a school classroom's
                  // absence of one is a verified fact about school classrooms.
                  // The operational record wins over the research file, so a
                  // verification made on the Merkez ve envanter page applies.
                  const statuses =
                    value === "school"
                      ? null
                      : (centreStatuses[value] ?? {
                          ...Object.fromEntries(
                            confirmedCapabilities(value as CentreId).map((id) => [id, "available"]),
                          ),
                          ...Object.fromEntries(
                            unavailableCapabilities(value as CentreId).map((id) => [
                              id,
                              "unavailable",
                            ]),
                          ),
                        });
                  setProfile((current) => ({
                    ...current,
                    capabilities: statuses
                      ? VENUE_CAPABILITY_IDS.filter((id) => statuses[id] === "available")
                      : [...SCHOOL_CLASSROOM.capabilities],
                    unavailableCapabilities: statuses
                      ? VENUE_CAPABILITY_IDS.filter((id) => statuses[id] === "unavailable")
                      : [...SCHOOL_CLASSROOM.unavailableCapabilities],
                  }));
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
              {venueId !== "school" && unsettledCapabilities.length > 0 && (
                <p className="panel-help" data-testid="unpublished-note">
                  Bu merkez için donanım durumu bilinmiyor:{" "}
                  {unsettledCapabilities
                    .map((capability) => VENUE_CAPABILITIES[capability].label)
                    .join(", ")}
                  . Bilinmemesi yok anlamına gelmez; aşağıdan &quot;Var&quot; ya da
                  &quot;Yok&quot; olarak doğrulayabilirsiniz.
                </p>
              )}
              <div className="capability-grid">
                {VENUE_CAPABILITY_IDS.map((capability) => {
                  const status = capabilityStatus(profile, capability);
                  return (
                    /*
                     * A radio group, not three toggle buttons. The states are
                     * mutually exclusive, so radios are what they are — and it
                     * matters for keyboard users: a group is a single tab stop
                     * navigated with arrows, where nine buttons pushed the
                     * generate action past sixty stops.
                     */
                    <fieldset className="capability" key={capability}>
                      <legend title={VENUE_CAPABILITIES[capability].description}>
                        {VENUE_CAPABILITIES[capability].label}
                      </legend>
                      <div className="capability-choice">
                        {CAPABILITY_CHOICES.map((choice) => (
                          <label
                            key={choice.value}
                            className={status === choice.value ? "chip selected" : "chip"}
                          >
                            <input
                              type="radio"
                              name={`capability-${capability}`}
                              value={choice.value}
                              checked={status === choice.value}
                              data-testid={`capability-${capability}-${choice.value}`}
                              onChange={() => setCapabilityStatus(capability, choice.value)}
                            />
                            {choice.label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </div>
              <p className="panel-help">
                &quot;Bilinmiyor&quot; bir yanıttır: donanım gerektiren rota elenmez, belirsiz
                olarak raporlanır.
              </p>
            </section>

            <section className="panel" hidden={step !== 2} data-testid="step-materials">
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
              {profile.materials.length > 0 && (
                <>
                  <p className="panel-help stock-help">
                    İsterseniz adet girin. Boş bırakılan malzeme için miktar denetimi yapılmaz;
                    girilen miktar oturumun ihtiyacından azsa uyarı verilir.
                  </p>
                  <div className="stock-grid">
                    {profile.materials.map((key) => (
                      <label className="stock-row" key={key}>
                        <span>{MATERIALS[key].label}</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="adet"
                          data-testid={`stock-${key}`}
                          value={profile.materialStock?.[key] ?? ""}
                          onChange={(event) => setStock(key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="panel" hidden={step !== 3} data-testid="step-delivery">
              <div className="panel-kicker"><WalletCards size={17} /> 04 · Bütçe, hazırlık ve erişilebilirlik</div>
              <div className="budget-row">
                <label><span>Toplam bütçe</span><div className="input-affix"><input type="number" min="0" value={profile.budgetTry} onChange={(event) => update("budgetTry", Number(event.target.value))} /><b>₺</b></div></label>
                <label className="check-label"><input type="checkbox" checked={profile.hardBudget} onChange={(event) => update("hardBudget", event.target.checked)} /><span><strong>Kesin bütçe sınırı</strong><small>Aşım olursa üretimi durdur</small></span></label>
              </div>
              <div className="inline-fields">
                <label>
                  <span>Hazırlık süresi</span>
                  <select
                    data-testid="prep-select"
                    value={profile.prepMinutes ?? 0}
                    onChange={(event) => update("prepMinutes", Number(event.target.value))}
                  >
                    {[0, 5, 15, 30, 60].map((minutes) => (
                      <option key={minutes} value={minutes}>{minutes} dakika</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Erişilebilirlik ihtiyacı</span>
                  <select
                    data-testid="accessibility-select"
                    value={profile.accessibilityNeeds[0] ?? ""}
                    onChange={(event) =>
                      update("accessibilityNeeds", event.target.value ? [event.target.value] : [])
                    }
                  >
                    <option value="">Belirtilmedi</option>
                    {ACCESSIBILITY_NEEDS.map((need) => (
                      <option key={need} value={need}>{need}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field-label" htmlFor="evidence-input">
                Beklenen öğrenme kanıtı (isteğe bağlı)
              </label>
              <textarea
                id="evidence-input"
                data-testid="evidence-input"
                className="evidence-input"
                rows={3}
                maxLength={300}
                placeholder="Oturum sonunda katılımcıda görmek istediğiniz somut çıktı."
                value={profile.expectedEvidence ?? ""}
                onChange={(event) => update("expectedEvidence", event.target.value)}
              />
              <p className="panel-help">
                Yazarsanız model bu hedefe doğru yazar; boş bırakılırsa aşamaların kendi kanıt
                ölçütleri kullanılır. Kanıtı model uydurmaz.
              </p>
            </section>
            <div className="wizard-nav">
              <button
                type="button"
                className="button"
                data-testid="step-back"
                disabled={step === 0}
                onClick={() => setStep((current) => Math.max(0, current - 1))}
              >
                <ArrowLeft size={16} /> Geri
              </button>
              <span className="wizard-progress" aria-live="polite">
                Adım {step + 1} / {STEPS.length}
              </span>
              <button
                type="button"
                className="button"
                data-testid="step-next"
                disabled={step === STEPS.length - 1}
                onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
              >
                İleri <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <aside className="summary-panel">
            <span className="overline">Üretim özeti</span>
            <h2>Atölyenin sınırları</h2>
            <dl>
              <div><dt><Clock3 /> Süre</dt><dd>{profile.durationMinutes} dk{(profile.prepMinutes ?? 0) > 0 ? ` +${profile.prepMinutes} hazırlık` : ""}</dd></div>
              <div><dt><Users /> Gruplar</dt><dd>{Math.ceil(profile.classSize / profile.groupSize)} × ~{profile.groupSize}</dd></div>
              {/*
                * Venue and format decide which routes are even eligible, so a
                * summary of "the workshop's limits" that omitted them was
                * listing the inputs that matter least.
                */}
              <div><dt><Building2 /> Yer</dt><dd>{venueId === "school" ? SCHOOL_CLASSROOM.label : CENTRES[venueId as CentreId].name}</dd></div>
              <div><dt><Sparkles /> Format</dt><dd>{selectedFormat.shortLabel ?? selectedFormat.label}</dd></div>
              <div><dt><ShieldCheck /> Donanım</dt><dd>{(profile.capabilities ?? []).length} var · {unsettledCapabilities.length} bilinmiyor</dd></div>
              <div><dt><WalletCards /> Bütçe</dt><dd>{profile.budgetTry} ₺{profile.hardBudget ? " kesin" : ""}</dd></div>
              <div><dt><PackageCheck /> Malzeme</dt><dd>{profile.materials.length} çeşit</dd></div>
            </dl>
            <div className="safety-note"><ShieldCheck /><div><strong>Güvenlik filtresi açık</strong><p>Yalnızca yaşa ve koşullara uygun, önceden onaylı etkinlik şablonları kullanılacak.</p></div></div>
            <button data-testid="generate-submit" className="button primary wide" type="button" disabled={profileBlocked} onClick={createPlan}>Atölyeyi üret <Sparkles size={18} /></button>
            <p className="microcopy">Atölye konusu üretim sırasında değiştirilemez.</p>
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

function GeneratingView({ live, proposal }: { live: boolean; proposal: boolean }) {
  const steps = [
    "Atölye konusu kilitlendi",
    "Uyumsuz rotalar elendi",
    "5E akışı dengelendi",
    "Güvenlik ve bütçe doğrulanıyor",
  ];
  return (
    <section className="generation-screen" data-testid="generating-indicator" aria-live="polite">
      <div className="generator-orb"><Sparkles /><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div>
      <span className="overline">{live ? "CANLI ÜRETİM motoru" : "REPLAY üretim motoru"}</span>
      <h1>{proposal ? "Konu için taslak oturum yazılıyor…" : "Atölye gerçek koşullara uyarlanıyor…"}</h1>
      <p>
        {proposal
          ? "Katalogdaki konu sabit tutularak, eldeki imkânlarla uygulanabilir bir taslak kuruluyor."
          : "Aynı atölye konusunu koruyarak güvenli ve uygulanabilir bir rota oluşturuyoruz."}
      </p>
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
        <div>
          <span className="overline">{planContext(plan)}</span>
          <h1>{plan.title}</h1>
          <p>{plan.adaptationSummary}</p>
        </div>
        <div className="plan-metrics"><div><Clock3 /><strong>{plan.profile.durationMinutes}</strong><span>dakika</span></div><div><Users /><strong>{plan.profile.classSize}</strong><span>öğrenci</span></div><div><WalletCards /><strong>{plan.estimatedCostTry} ₺</strong><span>tahmini</span></div></div>
      </header>

      <section className="objective-lock-card" data-testid="objective-lock">
        <div className="lock-symbol"><LockKeyhole /></div>
        <div><span className="overline">Konu Kilidi · {plan.objective.code}</span><blockquote>{plan.objective.canonicalText}</blockquote><small>{plan.objective.source}</small></div>
<ObjectiveLockBadge plan={plan} />
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
          <RouteDecisions plan={plan} />
          <details><summary>Doğrulama kaydı <ChevronDown /></summary><code>OBJECTIVE_COVERAGE: {coveredStages === plan.stages.length ? "PASS" : "BLOCK"}<br />DURATION_TOTAL: {plan.stages.reduce((sum, item) => sum + item.minutes, 0) === plan.profile.durationMinutes ? "PASS" : "BLOCK"}<br />SAFETY_BOUNDS: {safetyBlocked ? "BLOCK" : "PASS"}<br />INVENTORY: {plan.findings.some((finding) => finding.code === "APPROVED_SUBSTITUTION_APPLIED") ? "ADAPTED" : "PASS"}</code></details>
        </aside>
      </div>

    </section>
  );
}
