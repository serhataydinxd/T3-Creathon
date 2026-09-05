import { CircleAlert, CircleHelp, CircleSlash } from "lucide-react";
import type { WorkshopPlan } from "@/server/domain/types";

/**
 * Why each route the topic offers was, or was not, used.
 *
 * This existed in the plan long before it existed on screen: `rejectedRoutes`
 * was computed, persisted and documented — the README quotes a rejection
 * reason verbatim as a feature — but nothing ever rendered it, so the only
 * visible trace of a discarded route was the substitution note derived from it.
 *
 * Three states make that gap worse rather than merely untidy. An unconfirmed
 * facility now produces a warning finding, so if verified absences stayed
 * invisible the interface would shout about missing paperwork and stay silent
 * about a route that genuinely cannot run.
 */
export function RouteDecisions({ plan }: { plan: WorkshopPlan }) {
  const rejected = plan.rejectedRoutes ?? [];
  const uncertain = plan.uncertainRoutes ?? [];
  if (rejected.length === 0 && uncertain.length === 0) return null;

  return (
    <section className="route-decisions" data-testid="route-decisions">
      <span className="overline">Rota kararları</span>
      <ul>
        <li className="chosen">
          <CircleAlert aria-hidden />
          <div>
            <strong>{plan.routeName ?? "Seçilen rota"}</strong>
            <small>Uygulanabilir — bu oturum bu rotayla planlandı.</small>
          </div>
        </li>
        {uncertain.map((route) => (
          <li className="uncertain" key={route.routeId} data-code={route.code}>
            <CircleHelp aria-hidden />
            <div>
              <strong>{route.routeName}</strong>
              <small>Belirsiz — {route.reason}</small>
            </div>
          </li>
        ))}
        {rejected.map((route) => (
          <li className="rejected" key={route.routeId} data-code={route.code}>
            <CircleSlash aria-hidden />
            <div>
              <strong>{route.routeName}</strong>
              <small>Uygulanamaz — {route.reason}</small>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
