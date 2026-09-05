import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock3, MapPin, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { LIBRARY_PAGE_SIZE, applicabilityOf, listLibrary } from "@/server/domain/library";
import { AGE_COHORTS, AGE_COHORT_IDS, WORKSHOP_DOMAINS, WORKSHOP_DOMAIN_IDS } from "@/server/content/domains";
import { FORMATS, FORMAT_IDS } from "@/server/content/formats";

export const metadata: Metadata = {
  title: "Etkinlik kütüphanesi",
  robots: { index: false, follow: false },
};

const APPLICABILITY_LABEL = {
  "low-cost": "Düşük maliyetli",
  "no-power": "Elektriksiz uygulanabilir",
  "needs-facility": "Merkez donanımı gerekiyor",
  standard: "Standart kurulum",
} as const;

type Search = Record<string, string | string[] | undefined>;

/** A single value from the query string, ignoring repeats. */
function one(search: Search, key: string): string | undefined {
  const value = search[key];
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() ? text.trim() : undefined;
}

function number(search: Search, key: string): number | undefined {
  const raw = one(search, key);
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const search = await searchParams;

  // Filters live in the query string so a result set is a shareable link, and
  // every clause is applied in the database rather than after fetching.
  const filters = {
    q: one(search, "q"),
    domainId: one(search, "domain"),
    cohort: one(search, "cohort"),
    formatId: one(search, "format"),
    location: one(search, "location"),
    maxMinutes: number(search, "maxMinutes"),
    maxCostTry: number(search, "maxCost"),
    minParticipants: number(search, "minParticipants"),
    requiresElectricity: one(search, "noPower") === "1" ? false : undefined,
    requiresInternet: one(search, "noInternet") === "1" ? false : undefined,
    accessibility: one(search, "accessibility"),
    sort: (one(search, "sort") ?? "newest") as "newest" | "rating" | "cost" | "adapted",
    page: number(search, "page") ?? 1,
  };
  const { entries, total, page, hasMore } = await listLibrary(filters);

  const pageLink = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      const text = Array.isArray(value) ? value[0] : value;
      if (text && key !== "page") params.set(key, text);
    }
    params.set("page", String(next));
    return `/library?${params.toString()}`;
  };

  return (
    <AppShell user={user}>
      <section className="page">
        <div className="section-heading">
          <div>
            <span className="overline">Etkinlik kütüphanesi</span>
            <h1>Uygulanmış ve paylaşılmış etkinlikler</h1>
          </div>
        </div>
        <p className="panel-help" style={{ margin: "0 0 18px", maxWidth: "72ch" }}>
          Buradaki her kayıt gerçekten uygulanmış, pedagog tarafından onaylanmış ve eğitmeni
          tarafından paylaşıma açılmış bir oturumdur. Güvenlik olayı notları ve bireysel
          gereksinim açıklamaları kütüphaneye aktarılmaz.
        </p>

        <form className="library-filters" method="get" data-testid="library-filters">
          <label className="centre-search">
            <span className="visually-hidden">Ara</span>
            <input type="search" name="q" placeholder="Etkinlik, merkez veya şehir" defaultValue={filters.q ?? ""} data-testid="library-search" />
          </label>
          <label>
            <span className="visually-hidden">Tema</span>
            <select name="domain" defaultValue={filters.domainId ?? ""} data-testid="filter-domain">
              <option value="">Tüm temalar</option>
              {WORKSHOP_DOMAIN_IDS.map((id) => (
                <option key={id} value={id}>{WORKSHOP_DOMAINS[id].shortLabel}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Yaş grubu</span>
            <select name="cohort" defaultValue={filters.cohort ?? ""} data-testid="filter-cohort">
              <option value="">Tüm yaş grupları</option>
              {AGE_COHORT_IDS.map((id) => (
                <option key={id} value={id}>{AGE_COHORTS[id].label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Format</span>
            <select name="format" defaultValue={filters.formatId ?? ""}>
              <option value="">Tüm formatlar</option>
              {FORMAT_IDS.map((id) => (
                <option key={id} value={id}>{FORMATS[id].shortLabel}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">En yüksek maliyet</span>
            <input type="number" name="maxCost" min="0" placeholder="Bütçe ≤ ₺" defaultValue={filters.maxCostTry ?? ""} data-testid="filter-cost" />
          </label>
          <label className="check-label compact">
            <input type="checkbox" name="noPower" value="1" defaultChecked={filters.requiresElectricity === false} data-testid="filter-no-power" />
            <span>Elektriksiz</span>
          </label>
          <label>
            <span className="visually-hidden">Sıralama</span>
            <select name="sort" defaultValue={filters.sort} data-testid="filter-sort">
              <option value="newest">En yeni</option>
              <option value="rating">Puan</option>
              <option value="cost">Düşük maliyet</option>
              <option value="adapted">En çok uyarlanan</option>
            </select>
          </label>
          <button className="button" type="submit" data-testid="apply-filters">Filtrele</button>
        </form>

        <p className="panel-help" data-testid="library-count">
          {total} kayıt · sayfa {page}
        </p>

        {entries.length === 0 ? (
          <div className="empty-state" data-testid="library-empty">
            <BookOpen />
            <h3>Bu ölçütlere uyan etkinlik yok.</h3>
            <p>
              Kütüphane, onaylanmış ve paylaşıma açılmış uygulama raporlarıyla büyür. Filtreleri
              genişletmeyi deneyin.
            </p>
          </div>
        ) : (
          <div className="library-grid" data-testid="library-grid">
            {entries.map((entry) => (
              <article className="library-card" key={entry.id} data-testid={`entry-${entry.id}`}>
                <span className="overline">
                  {WORKSHOP_DOMAINS[entry.domainId as keyof typeof WORKSHOP_DOMAINS]?.shortLabel ?? entry.domainId}
                  {" · "}
                  {AGE_COHORTS[entry.cohort as keyof typeof AGE_COHORTS]?.label ?? entry.cohort}
                </span>
                <h2>{entry.title}</h2>
                <p className="library-place">
                  <MapPin aria-hidden /> {entry.centreName ?? "Okul sınıfı"}
                  {entry.centreLocation ? ` · ${entry.centreLocation}` : ""}
                  {entry.deliveredOn ? ` · ${entry.deliveredOn}` : ""}
                </p>
                <ul className="library-facts">
                  <li><Clock3 aria-hidden /> {entry.actualMinutes ?? "—"} dk</li>
                  <li><Users aria-hidden /> {entry.actualParticipants ?? "—"} katılımcı</li>
                  <li><WalletCards aria-hidden /> {entry.actualCostTry ?? "—"} ₺</li>
                </ul>
                {Array.isArray(entry.keyMaterials) && entry.keyMaterials.length > 0 && (
                  <p className="library-materials">{(entry.keyMaterials as string[]).join(", ")}</p>
                )}
                <div className="library-tags">
                  <span className="status ready" data-testid={`applicability-${entry.id}`}>
                    {APPLICABILITY_LABEL[applicabilityOf(entry)]}
                  </span>
                  <span className="library-adapted">{entry.adaptationCount} uyarlama</span>
                  {entry.rating !== null && <span className="library-rating">{entry.rating}/5</span>}
                </div>
                <Link className="button wide" href={`/library/${entry.id}`}>Raporu aç</Link>
              </article>
            ))}
          </div>
        )}

        {(page > 1 || hasMore) && (
          <nav className="library-pager" aria-label="Sayfalar">
            {page > 1 && <Link className="button" href={pageLink(page - 1)} data-testid="page-prev">Önceki</Link>}
            <span className="wizard-progress">{LIBRARY_PAGE_SIZE} kayıt / sayfa</span>
            {hasMore && <Link className="button" href={pageLink(page + 1)} data-testid="page-next">Sonraki</Link>}
          </nav>
        )}
      </section>
    </AppShell>
  );
}
