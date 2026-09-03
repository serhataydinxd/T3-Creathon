import "server-only";

import type { Finding, ResourceProfile, WorkshopPlan } from "@/server/domain/types";
import { generateWorkshop } from "@/server/domain/generator";
import { authorWorkshop } from "./authoring";
import {
  ProviderError,
  createOpenAICompatibleProvider,
  readProviderConfig,
} from "./provider";

// Kept below the CloudFront origin read timeout so a slow provider degrades to
// the replay plan inside the app instead of surfacing as a gateway error.
const DEFAULT_TIMEOUT_MS = 55_000;

// Below this there is not enough budget left for a provider call to land, so
// the fallback is taken instead of starting an attempt that cannot finish.
const MIN_ATTEMPT_MS = 12_000;

// One retry, never a loop against a provider that fails fast.
const MAX_ATTEMPTS = 2;

// This provider's latency is bimodal: it either answers in roughly 20-30s or
// stalls indefinitely. Capping a single attempt well below the overall deadline
// converts a stall into a second chance instead of spending the whole budget
// waiting on a call that was never going to land.
const MAX_ATTEMPT_MS = 28_000;

// Every provider-side failure is worth one more attempt, a stalled call
// included, because a capped attempt leaves budget behind. Only a
// misconfiguration is hopeless, and that is checked before the loop.
const RETRYABLE = new Set([
  "EMPTY_COMPLETION",
  "INVALID_JSON",
  "SCHEMA_MISMATCH",
  "TIMEOUT",
  "TRANSPORT",
  "HTTP_ERROR",
]);

function fallbackFinding(reason: string): Finding {
  return {
    code: "AI_FALLBACK_APPLIED",
    severity: "warning",
    message: `Canlı üretim tamamlanamadı (${reason}); doğrulanmış çevrimdışı plan kullanıldı.`,
  };
}

export function liveGenerationEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return env.APP_MODE?.trim().toLowerCase() === "live" && readProviderConfig(env) !== null;
}

export type GenerationOutcome = {
  plan: WorkshopPlan;
  /**
   * The model that actually authored the prose, or null when the plan came from
   * the deterministic path. Recorded alongside the plan so provenance is
   * attributable rather than a bare LIVE flag.
   */
  model: string | null;
};

/**
 * Always produces a plan. The deterministic skeleton is generated first so a
 * provider failure, timeout or contract breach can never block a demo: it
 * degrades to the replay plan and reports why as a finding.
 */
export async function generateWorkshopPlan(
  profile: ResourceProfile,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<GenerationOutcome> {
  const skeleton = generateWorkshop(profile);
  if (!liveGenerationEnabled(env)) return { plan: skeleton, model: null };

  const config = readProviderConfig(env);
  if (!config) return { plan: skeleton, model: null };
  const timeoutMs = Number(env.AI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const provider = createOpenAICompatibleProvider(config);
  const deadline = Date.now() + timeoutMs;
  let reason = "UNKNOWN";

  // A free tier intermittently returns an empty or malformed completion, so one
  // retry is worth it. Bounded by both the attempt count and the shared
  // deadline: the count stops a fast-failing provider from being hammered, and
  // the deadline stops the request outliving the edge timeout.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_ATTEMPT_MS) break;
    try {
      const plan = await authorWorkshop(
        provider,
        profile,
        skeleton,
        Math.min(MAX_ATTEMPT_MS, remainingMs),
      );
      return { plan, model: config.model };
    } catch (error) {
      reason = error instanceof ProviderError ? error.code : "UNKNOWN";
      // Log the code only. Prompts and completions carry classroom context.
      console.warn(`[imkan] live generation attempt ${attempt} failed: ${reason}`);
      if (!RETRYABLE.has(reason)) break;
    }
  }
  return {
    plan: { ...skeleton, findings: [...skeleton.findings, fallbackFinding(reason)] },
    model: null,
  };
}
