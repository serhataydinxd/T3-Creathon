import { AGE_COHORTS, WORKSHOP_DOMAINS } from "@/server/content/domains";
import type { WorkshopPlan } from "@/server/domain/types";

/**
 * The subject line above a workshop: theme, cohort, whether it is a proposal.
 *
 * Read off the plan rather than written into the markup — the corpus spans
 * several themes and cohorts, and a fixed caption was wrong for every topic
 * but the first one. Kept in a plain module rather than beside the lab, which
 * is a client component: the saved-package page renders on the server and
 * would otherwise import a client reference instead of this function.
 *
 * Both fields are optional on a plan and validated here rather than trusted,
 * because packages saved before the taxonomy existed carry neither.
 */
export function planContext(plan: WorkshopPlan): string {
  const parts = [
    plan.domainId && plan.domainId in WORKSHOP_DOMAINS
      ? WORKSHOP_DOMAINS[plan.domainId as keyof typeof WORKSHOP_DOMAINS].shortLabel
      : null,
    plan.cohort && plan.cohort in AGE_COHORTS
      ? AGE_COHORTS[plan.cohort as keyof typeof AGE_COHORTS].label
      : null,
    plan.topicStatus === "proposal" ? "TASLAK ÖNERİ" : null,
    "5E",
  ];
  return parts.filter(Boolean).join(" · ");
}
