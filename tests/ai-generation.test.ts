import { describe, expect, it, vi } from "vitest";
import { DEFAULT_PROFILE, generateWorkshop } from "@/server/domain/generator";
import { authoredWorkshopSchema, mergeAuthoredWorkshop } from "@/server/ai/authoring";
import { generateWorkshopPlan, liveGenerationEnabled } from "@/server/ai/generate";
import { extractJsonObject, readProviderConfig } from "@/server/ai/provider";

const STAGE_KEYS = ["engage", "explore", "explain", "elaborate", "evaluate"] as const;

function authoredFixture() {
  return {
    title: "Devrelerde Parlaklık Avı",
    adaptationSummary: "Kâğıt tabanlı model ile aynı kazanım korunarak akış kuruldu.",
    stages: STAGE_KEYS.map((key) => ({
      key,
      title: `${key} için üretilmiş başlık`,
      teacherAction: "Öğretmen görev kartlarını dağıtır ve güvenlik yönergesini okur.",
      studentAction: "Öğrenci grup içinde akım yolunu modelleyip şemaya aktarır.",
      evidence: "Öğrenci iki bağlantı biçimini doğru sembollerle çizerek gösterir.",
      objectiveConnection: "Kazanımdaki devre şeması çizme becerisini doğrudan ölçer.",
    })),
  };
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

function completion(payload: unknown) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function stubProvider(payload: unknown) {
  return vi.fn<FetchLike>(async () => completion(payload));
}

function abortError() {
  return Object.assign(new Error("aborted"), { name: "AbortError" });
}

const LIVE_ENV = {
  APP_MODE: "live",
  LLM_API_KEY: "test-key",
  LLM_BASE_URL: "https://api.example.invalid/v1",
  LLM_MODEL: "test-model",
};

describe("live generation configuration", () => {
  it("stays in replay unless the mode and the key are both present", () => {
    expect(liveGenerationEnabled({})).toBe(false);
    expect(liveGenerationEnabled({ APP_MODE: "live" })).toBe(false);
    expect(liveGenerationEnabled({ LLM_API_KEY: "k" })).toBe(false);
    expect(liveGenerationEnabled({ APP_MODE: "replay", LLM_API_KEY: "k" })).toBe(false);
    expect(liveGenerationEnabled(LIVE_ENV)).toBe(true);
  });

  it("prefers neutral provider variables and trims a trailing slash", () => {
    expect(
      readProviderConfig({
        LLM_API_KEY: "new-key",
        LLM_BASE_URL: "https://new.test/v1/",
        LLM_MODEL: "new-model",
        DEEPSEEK_API_KEY: "legacy-key",
      }),
    ).toEqual({
      apiKey: "new-key",
      baseUrl: "https://new.test/v1",
      model: "new-model",
    });
  });

  it("defaults a generic key to direct OpenAI Luna", () => {
    expect(readProviderConfig({ LLM_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.6-luna",
    });
  });

  it("keeps the legacy DeepSeek configuration working", () => {
    expect(readProviderConfig({ DEEPSEEK_API_KEY: "k" })).toEqual({
      apiKey: "k",
      baseUrl: "https://api.b.ai/v1",
      model: "deepseek-v4-flash",
    });
    expect(readProviderConfig({ DEEPSEEK_API_KEY: "k", DEEPSEEK_BASE_URL: "https://x.test/v1/" })?.baseUrl).toBe(
      "https://x.test/v1",
    );
  });
});

describe("completion parsing", () => {
  it("recovers an object from a fenced or padded completion", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJsonObject('Elbette!\n{"a":2}\nUmarım yardımcı olur.')).toEqual({ a: 2 });
  });

  it("rejects a completion with no object", () => {
    expect(() => extractJsonObject("özür dilerim, üretemedim")).toThrow();
  });
});

describe("authored merge keeps every deterministic guarantee", () => {
  it("replaces prose but not stages, minutes, materials, cost or findings", () => {
    const skeleton = generateWorkshop(DEFAULT_PROFILE);
    const merged = mergeAuthoredWorkshop(skeleton, authoredFixture());

    expect(merged.mode).toBe("LIVE");
    expect(merged.title).toBe("Devrelerde Parlaklık Avı");
    expect(merged.stages.map((stage) => stage.key)).toEqual([...STAGE_KEYS]);
    expect(merged.stages.map((stage) => stage.minutes)).toEqual(
      skeleton.stages.map((stage) => stage.minutes),
    );
    expect(merged.stages.map((stage) => stage.materialKeys)).toEqual(
      skeleton.stages.map((stage) => stage.materialKeys),
    );
    expect(merged.materialPlan).toEqual(skeleton.materialPlan);
    expect(merged.estimatedCostTry).toBe(skeleton.estimatedCostTry);
    expect(merged.findings).toEqual(skeleton.findings);
    expect(merged.objective).toEqual(skeleton.objective);
    expect(merged.stages[0].teacherAction).toContain("güvenlik yönergesini");
  });

  it("refuses a completion that drops or duplicates a 5E stage", () => {
    const short = { ...authoredFixture(), stages: authoredFixture().stages.slice(0, 4) };
    expect(authoredWorkshopSchema.safeParse(short).success).toBe(false);

    const duplicated = authoredFixture();
    duplicated.stages[1] = { ...duplicated.stages[1], key: "engage" };
    expect(authoredWorkshopSchema.safeParse(duplicated).success).toBe(false);
  });
});

describe("generateWorkshopPlan never fails a demo", () => {
  it("returns the replay plan when live generation is off", async () => {
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, {});
    expect(plan.mode).toBe("REPLAY");
    expect(plan.findings.map((finding) => finding.code)).not.toContain("AI_FALLBACK_APPLIED");
  });

  it("attributes the model on the authored path and nothing on the fallback", async () => {
    vi.stubGlobal("fetch", stubProvider(authoredFixture()));
    const live = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);
    expect(live.plan.mode).toBe("LIVE");
    expect(live.model).toBe(LIVE_ENV.LLM_MODEL);
    vi.unstubAllGlobals();

    vi.stubGlobal("fetch", stubProvider({ title: "kısa", stages: [] }));
    const fell_back = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);
    expect(fell_back.plan.mode).toBe("REPLAY");
    expect(fell_back.model).toBeNull();
    vi.unstubAllGlobals();
  });

  it("returns the authored plan when the provider answers", async () => {
    const fetchSpy = stubProvider(authoredFixture());
    vi.stubGlobal("fetch", fetchSpy);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);

    expect(plan.mode).toBe("LIVE");
    expect(plan.title).toBe("Devrelerde Parlaklık Avı");
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.invalid/v1/chat/completions");
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "test-model", stream: false });
    vi.unstubAllGlobals();
  });

  it("uses Gemini low thinking without deprecated temperature sampling", async () => {
    const fetchSpy = stubProvider(authoredFixture());
    vi.stubGlobal("fetch", fetchSpy);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, {
      APP_MODE: "live",
      LLM_API_KEY: "gemini-key",
      LLM_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      LLM_MODEL: "gemini-3.7-flash",
    });

    expect(plan.mode).toBe("LIVE");
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    );
    const request = JSON.parse(String(init.body));
    expect(request).toMatchObject({
      model: "gemini-3.7-flash",
      stream: false,
      extra_body: { google: { thinking_config: { thinking_level: "low" } } },
    });
    expect(request).not.toHaveProperty("temperature");
    vi.unstubAllGlobals();
  });

  it("uses OpenAI structured output with reasoning disabled", async () => {
    const fetchSpy = stubProvider(authoredFixture());
    vi.stubGlobal("fetch", fetchSpy);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, {
      APP_MODE: "live",
      LLM_API_KEY: "openai-key",
      LLM_BASE_URL: "https://api.openai.com/v1/",
      LLM_MODEL: "gpt-5.6-luna",
    });

    expect(plan.mode).toBe("LIVE");
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    const request = JSON.parse(String(init.body));
    expect(request).toMatchObject({
      model: "gpt-5.6-luna",
      messages: [{ role: "developer" }, { role: "user" }],
      reasoning_effort: "none",
      max_completion_tokens: 6000,
      response_format: {
        type: "json_schema",
        json_schema: { name: "workshop_authoring", strict: true },
      },
    });
    expect(request.response_format.json_schema.schema).toMatchObject({
      type: "object",
      additionalProperties: false,
    });
    expect(request).not.toHaveProperty("temperature");
    expect(request).not.toHaveProperty("max_tokens");
    vi.unstubAllGlobals();
  });

  it("falls back to the replay plan and reports why when the contract breaks", async () => {
    vi.stubGlobal("fetch", stubProvider({ title: "kısa", stages: [] }));
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);

    expect(plan.mode).toBe("REPLAY");
    expect(plan.findings).toContainEqual(
      expect.objectContaining({ code: "AI_FALLBACK_APPLIED", severity: "warning" }),
    );
    // The deterministic plan must survive intact alongside the warning.
    expect(plan.estimatedCostTry).toBeGreaterThan(0);
    expect(plan.stages).toHaveLength(5);
    vi.unstubAllGlobals();
  });

  it("gives up after one retry instead of hammering a failing provider", async () => {
    const failing = vi.fn<FetchLike>(async () =>
      new Response("nope", { status: 503 }),
    );
    vi.stubGlobal("fetch", failing);
    const { plan: failed } = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);
    expect(failed.mode).toBe("REPLAY");
    expect(failed.findings.map((finding) => finding.code)).toContain("AI_FALLBACK_APPLIED");
    // A fast 503 must not be retried in a tight loop until the deadline.
    expect(failing).toHaveBeenCalledTimes(2);

    const dropped = vi.fn<FetchLike>(async () => {
      throw new Error("socket hang up");
    });
    vi.stubGlobal("fetch", dropped);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);
    expect(plan.mode).toBe("REPLAY");
    expect(dropped).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("retries a stalled attempt, because a capped attempt leaves budget behind", async () => {
    const fetchSpy = vi.fn<FetchLike>(async () => {
      throw abortError();
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);

    expect(plan.mode).toBe("REPLAY");
    expect(plan.findings.map((finding) => finding.code)).toContain("AI_FALLBACK_APPLIED");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it("retries once inside the deadline when a completion comes back empty", async () => {
    const fetchSpy = vi.fn<FetchLike>(async () => {
      if (fetchSpy.mock.calls.length === 1) {
        return new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return completion(authoredFixture());
    });
    vi.stubGlobal("fetch", fetchSpy);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, LIVE_ENV);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(plan.mode).toBe("LIVE");
    expect(plan.findings.map((finding) => finding.code)).not.toContain("AI_FALLBACK_APPLIED");
    vi.unstubAllGlobals();
  });

  it("starts no attempt it cannot finish inside the remaining budget", async () => {
    const fetchSpy = vi.fn<FetchLike>(async () => completion(authoredFixture()));
    vi.stubGlobal("fetch", fetchSpy);
    const { plan: plan } = await generateWorkshopPlan(DEFAULT_PROFILE, { ...LIVE_ENV, AI_TIMEOUT_MS: "500" });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(plan.mode).toBe("REPLAY");
    expect(plan.findings.map((finding) => finding.code)).toContain("AI_FALLBACK_APPLIED");
    vi.unstubAllGlobals();
  });
});
