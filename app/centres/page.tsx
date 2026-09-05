import type { Metadata } from "next";
import { Building2, CircleCheck, CircleHelp, CircleSlash } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/server/auth/session";
import { listCentreStates } from "@/server/domain/centre-store";
import { verifyCapabilityAction } from "@/app/actions/centres";
import { VENUE_CAPABILITIES } from "@/server/content/venues";
import { CentreFilter } from "@/components/centre-filter";

export const metadata: Metadata = {
  title: "Merkez ve envanter",
  robots: { index: false, follow: false },
};

const STATUS_LABEL = {
  available: "Var",
  unavailable: "Yok",
  unknown: "Bilinmiyor",
} as const;

const STATUS_ICON = {
  available: CircleCheck,
  unavailable: CircleSlash,
  unknown: CircleHelp,
} as const;

const dateFormat = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" });

export default async function CentresPage() {
  const user = await requireUser();
  // Everyone may read the record; only the roles that are actually in the
  // building may change it. The action enforces that independently.
  const canVerify = user.role === "educator" || user.role === "manager";
  const centres = await listCentreStates();

  return (
    <AppShell user={user}>
      <section className="page">
        <div className="section-heading">
          <div>
            <span className="overline">Merkez ve envanter</span>
            <h1>Merkez donanım kaydı</h1>
          </div>
        </div>
        <p className="panel-help" style={{ margin: "0 0 20px", maxWidth: "70ch" }}>
          Bu kayıt, Bilim Türkiye merkez sayfalarında yayımlanan bilgiyle başlar. Yayımlanmamış
          bir donanım <b>yok</b> sayılmaz; <b>bilinmiyor</b> olarak kalır ve o donanımı gerektiren
          rota elenmek yerine belirsiz olarak raporlanır.
          {canVerify
            ? " Merkezde bulunuyorsanız durumu doğrulayabilirsiniz; adınız ve tarih kaydedilir."
            : " Durumu yalnızca eğitmen ve yöneticiler doğrulayabilir."}
        </p>

        <CentreFilter
          centres={centres.map((centre) => ({
            slug: centre.slug,
            // Pre-lowered with the Turkish locale so "İstanbul" matches
            // "istanbul" — the dotted capital does not fold with toLowerCase().
            haystack: `${centre.name} ${centre.location}`.toLocaleLowerCase("tr"),
            unknownCount: centre.capabilities.filter((item) => item.status === "unknown").length,
            node: (
              <article className="centre-card" key={centre.slug} data-testid={`centre-${centre.slug}`}>
                <header>
                  <Building2 />
                  <div>
                    <strong>{centre.name}</strong>
                    <small>{centre.location}</small>
                  </div>
                </header>
                {centre.note && <p className="centre-note">{centre.note}</p>}
                <ul>
                  {centre.capabilities.map((capability) => {
                    const Icon = STATUS_ICON[capability.status];
                    return (
                      <li key={capability.capability} data-status={capability.status}>
                        <span className={`centre-status ${capability.status}`}>
                          <Icon aria-hidden /> {STATUS_LABEL[capability.status]}
                        </span>
                        <div>
                          <strong>{VENUE_CAPABILITIES[capability.capability].label}</strong>
                          <small>
                            {capability.verifiedAt
                              ? `Kişi tarafından doğrulandı · ${dateFormat.format(capability.verifiedAt)}`
                              : capability.sourceUrl
                                ? "Merkez sayfasında yayımlanmış"
                                : "Kaynakta bilgi yok"}
                            {capability.note ? ` · ${capability.note}` : ""}
                          </small>
                        </div>
                        {canVerify && (
                          <form action={verifyCapabilityAction} className="centre-verify">
                            <input type="hidden" name="centreSlug" value={centre.slug} />
                            <input type="hidden" name="capability" value={capability.capability} />
                            <label className="visually-hidden" htmlFor={`s-${centre.slug}-${capability.capability}`}>
                              {`${centre.name} ${VENUE_CAPABILITIES[capability.capability].label} durumu`}
                            </label>
                            <select
                              id={`s-${centre.slug}-${capability.capability}`}
                              name="status"
                              defaultValue={capability.status}
                              data-testid={`status-${centre.slug}-${capability.capability}`}
                            >
                              <option value="available">Var</option>
                              <option value="unavailable">Yok</option>
                              <option value="unknown">Bilinmiyor</option>
                            </select>
                            <button
                              className="button"
                              type="submit"
                              data-testid={`verify-${centre.slug}-${capability.capability}`}
                            >
                              Doğrula
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ),
          }))}
        />
      </section>
    </AppShell>
  );
}
