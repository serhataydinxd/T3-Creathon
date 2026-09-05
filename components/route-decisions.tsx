import { CircleCheck, CircleHelp, CircleSlash, TriangleAlert, Wrench } from "lucide-react";
import { CANDIDATE_STATUS_LABEL, type CandidateStatus } from "@/server/domain/candidates";
import type { WorkshopPlan } from "@/server/domain/types";

/**
 * Every route the topic offers, and why each one can or cannot be delivered.
 *
 * This existed in the plan long before it existed on screen: rejected routes
 * were computed, persisted and documented — the README quotes a rejection
 * reason verbatim as a feature — but nothing rendered them, so the only
 * visible trace of a discarded route was the substitution note derived from it.
 *
 * Showing the reasoning rather than only its conclusion is the point. "The
 * dome route needs a planetarium and nobody has recorded whether this centre
 * has one" tells a trainer what to do next; a silently substituted paper-tube
 * activity does not.
 */
const ICON: Record<CandidateStatus, typeof CircleCheck> = {
  ready: CircleCheck,
  adaptable: Wrench,
  uncertain: CircleHelp,
  blocked: CircleSlash,
};

export function RouteDecisions({ plan, limit = 3 }: { plan: WorkshopPlan; limit?: number }) {
  const candidates = (plan.candidates ?? []).slice(0, limit);
  if (candidates.length === 0) return null;

  return (
    <section className="route-decisions" data-testid="route-decisions">
      <span className="overline">Rota adayları</span>
      <ul>
        {candidates.map((candidate) => {
          const Icon = ICON[candidate.status];
          const chosen = candidate.routeId === plan.routeId;
          return (
            <li
              key={candidate.routeId}
              className={candidate.status}
              data-testid={`candidate-${candidate.routeId}`}
              data-status={candidate.status}
            >
              <Icon aria-hidden />
              <div>
                <strong>
                  {candidate.routeName}
                  {chosen && <span className="candidate-chosen">bu oturum</span>}
                </strong>
                <span className="candidate-status">{CANDIDATE_STATUS_LABEL[candidate.status]}</span>
                {candidate.reasons.map((reason) => (
                  <small key={reason}>{reason}</small>
                ))}
                {candidate.missingMaterials.length > 0 && (
                  <small>Eksik malzeme: {candidate.missingMaterials.join(", ")}</small>
                )}
                {candidate.unknownCapabilities.length > 0 && (
                  <small>Durumu bilinmeyen donanım: {candidate.unknownCapabilities.join(", ")}</small>
                )}
                {candidate.substitutionNote && <small>{candidate.substitutionNote}</small>}
                {candidate.safetyNotes.map((note) => (
                  <small className="candidate-safety" key={note}>
                    <TriangleAlert aria-hidden /> {note}
                  </small>
                ))}
                <small className="candidate-cost">
                  Toplam {candidate.totalCostTry} ₺ · Temin {candidate.acquisitionCostTry} ₺
                  {candidate.overBudget ? " · kesin bütçeyi aşıyor" : ""}
                </small>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
