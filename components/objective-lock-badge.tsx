import { CircleAlert, HelpCircle, ShieldCheck } from "lucide-react";
import type { WorkshopPlan } from "@/server/domain/types";

/**
 * The badge beside a locked topic.
 *
 * It sits next to a curriculum code and its official wording, so whatever it
 * says is read as a statement about *that*. "Doğrulandı" therefore may only
 * appear when a person has actually checked the mapping against the source
 * document — never merely because the text is immutable during generation,
 * which is all `locked` has ever meant.
 *
 * A plan saved before verification state was recorded has none, and is treated
 * as unverified: the weaker claim is the true one.
 */
export function ObjectiveLockBadge({ plan }: { plan: WorkshopPlan }) {
  if (plan.topicStatus === "proposal") {
    return (
      <span className="verified pending" data-testid="lock-badge" data-state="proposal">
        <CircleAlert /> Taslak öneri
      </span>
    );
  }
  const verification = plan.objective.verification ?? "unverified";
  if (verification === "verified") {
    return (
      <span className="verified" data-testid="lock-badge" data-state="verified">
        <ShieldCheck /> Doğrulandı
      </span>
    );
  }
  if (verification === "none") {
    return (
      <span className="verified neutral" data-testid="lock-badge" data-state="none">
        <HelpCircle /> Kazanım eşlemesi yok
      </span>
    );
  }
  return (
    <span className="verified pending" data-testid="lock-badge" data-state="unverified">
      <CircleAlert /> Uzman doğrulaması bekliyor
    </span>
  );
}
