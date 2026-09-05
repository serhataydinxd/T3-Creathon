"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";

/**
 * Search and narrowing for the centre record.
 *
 * Thirty centres times three facilities is ninety rows, which is unreadable as
 * a flat list — and the question people actually bring to this screen is
 * narrow: "what do we still not know about my centre?" The unknown filter
 * answers exactly that, and doubles as the work queue for verification.
 *
 * Client-side because the whole record is thirty rows: filtering here costs
 * nothing and keeps the page a server component that reads the database once.
 */
export function CentreFilter({
  centres,
}: {
  centres: { slug: string; haystack: string; unknownCount: number; node: ReactNode }[];
}) {
  const [query, setQuery] = useState("");
  const [onlyUnknown, setOnlyUnknown] = useState(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr");
    return centres.filter(
      (centre) =>
        (!onlyUnknown || centre.unknownCount > 0) &&
        (needle === "" || centre.haystack.includes(needle)),
    );
  }, [centres, query, onlyUnknown]);

  const unknownTotal = centres.reduce((sum, centre) => sum + centre.unknownCount, 0);

  return (
    <>
      <div className="centre-controls">
        <label className="centre-search">
          <Search aria-hidden />
          <span className="visually-hidden">Merkez ara</span>
          <input
            type="search"
            data-testid="centre-search"
            placeholder="Merkez veya şehir ara"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          data-testid="filter-unknown"
          aria-pressed={onlyUnknown}
          className={onlyUnknown ? "chip selected" : "chip"}
          onClick={() => setOnlyUnknown((current) => !current)}
        >
          Yalnızca bilinmeyenler ({unknownTotal})
        </button>
      </div>
      <p className="panel-help" aria-live="polite" data-testid="centre-count">
        {visible.length} / {centres.length} merkez gösteriliyor.
      </p>
      <div className="centre-list" data-testid="centre-list">
        {visible.map((centre) => (
          <div key={centre.slug}>{centre.node}</div>
        ))}
      </div>
      {visible.length === 0 && (
        <div className="empty-state" data-testid="centre-empty">
          <h3>Aramanıza uyan merkez yok.</h3>
          <p>Farklı bir merkez veya şehir adı deneyin.</p>
        </div>
      )}
    </>
  );
}
