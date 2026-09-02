import "server-only";

import type { z } from "zod";

export type ProviderUsage = { inputTokens: number; outputTokens: number };

export type ProviderResult<T> = {
  value: T;
  usage: ProviderUsage;
  latencyMs: number;
  model: string;
};

// docs/04 specifies a jsonSchema field; this project already validates with zod
// everywhere else, so the schema is passed as a zod type and the prompt carries
// the shape. The contract is otherwise the documented one.
export interface LLMProvider {
  readonly name: string;
  generate<T>(input: {
    schema: z.ZodType<T>;
    system: string;
    user: string;
    timeoutMs: number;
    maxOutputTokens: number;
  }): Promise<ProviderResult<T>>;
}

export class ProviderError extends Error {
  constructor(
    readonly code:
      | "NOT_CONFIGURED"
      | "TIMEOUT"
      | "TRANSPORT"
      | "HTTP_ERROR"
      | "EMPTY_COMPLETION"
      | "INVALID_JSON"
      | "SCHEMA_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Models are asked for bare JSON, but chat endpoints commonly wrap it in a
 * fenced block anyway. Recover the outermost object rather than failing.
 */
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new ProviderError("INVALID_JSON", "The completion contained no JSON object.");
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new ProviderError("INVALID_JSON", "The completion was not parsable JSON.");
  }
}

type ChatCompletion = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export type OpenAICompatibleConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function readProviderConfig(
  env: Readonly<Record<string, string | undefined>>,
): OpenAICompatibleConfig | null {
  const apiKey = env.LLM_API_KEY?.trim() || env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (
      env.LLM_BASE_URL?.trim() ||
      env.DEEPSEEK_BASE_URL?.trim() ||
      "https://api.b.ai/v1"
    ).replace(/\/+$/, ""),
    model: env.LLM_MODEL?.trim() || env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash",
  };
}

function isGemini(config: OpenAICompatibleConfig): boolean {
  return (
    config.baseUrl.includes("generativelanguage.googleapis.com") ||
    config.model.toLowerCase().startsWith("gemini-")
  );
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
  fetchImpl: typeof fetch = fetch,
): LLMProvider {
  const gemini = isGemini(config);
  return {
    name: `openai-compatible:${config.model}`,
    async generate({ schema, system, user, timeoutMs, maxOutputTokens }) {
      const startedAt = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            // The whole document is validated at once, so there is nothing to
            // stream to and a single response keeps the failure path simple.
            stream: false,
            // Reasoning models bill reasoning against max_tokens and expand
            // their reasoning to fill whatever room they are given, so too
            // small a budget leaves nothing for the answer and the completion
            // arrives truncated or empty. Callers pass real headroom.
            // Gemini 3.7 rejects legacy sampling controls. Low thinking keeps
            // this bounded authoring request comfortably inside the edge
            // timeout while other OpenAI-compatible providers keep the
            // previously tested temperature.
            ...(gemini
              ? {
                  extra_body: {
                    google: { thinking_config: { thinking_level: "low" } },
                  },
                }
              : { temperature: 0.4 }),
            max_tokens: maxOutputTokens,
          }),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new ProviderError("TIMEOUT", `The provider did not answer within ${timeoutMs}ms.`);
        }
        throw new ProviderError("TRANSPORT", "The provider could not be reached.");
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        // The body may carry the provider's key back; never propagate it.
        throw new ProviderError("HTTP_ERROR", `The provider answered ${response.status}.`);
      }

      const body = (await response.json()) as ChatCompletion;
      const content = body.choices?.[0]?.message?.content;
      if (!content?.trim()) {
        throw new ProviderError("EMPTY_COMPLETION", "The provider returned no content.");
      }

      const parsed = schema.safeParse(extractJsonObject(content));
      if (!parsed.success) {
        throw new ProviderError(
          "SCHEMA_MISMATCH",
          `The completion did not match the contract: ${parsed.error.issues
            .slice(0, 3)
            .map((issue) => issue.path.join("."))
            .join(", ")}`,
        );
      }

      return {
        value: parsed.data,
        usage: {
          inputTokens: body.usage?.prompt_tokens ?? 0,
          outputTokens: body.usage?.completion_tokens ?? 0,
        },
        latencyMs: Date.now() - startedAt,
        model: config.model,
      };
    },
  };
}
