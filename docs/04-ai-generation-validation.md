# AI Generation and Validation

## Implemented mode

`APP_MODE=live` plus a provider key enables provider-backed authoring; anything
else stays deterministic. The provider only ever writes prose: stage titles,
teacher and student actions, learning evidence and the objective connection.
Stage keys, minute allocation, group count, the material list, cost and every
finding are recomputed in code, so a model can change how a workshop reads but
never what it guarantees. `createDraft` re-derives the skeleton server-side and
overlays only the reviewed prose, which is why a saved package cannot inherit a
model's mistake about materials or budget.

Any provider failure — stall, empty completion, unparsable JSON, contract breach
— degrades to the deterministic plan and reports `AI_FALLBACK_APPLIED` as a
warning. Generation therefore always returns a usable workshop.

`deepseek-v4-flash` is a reasoning model that bills reasoning against
`max_tokens` and expands its reasoning to fill the budget it is given, so the
budget carries deliberate headroom above the expected document size. Measured
latency is bimodal: roughly 20-30s when it answers, or a stall. A single attempt
is therefore capped well below the overall deadline so a stall becomes a retry
rather than a spent budget, and the deadline stays below the CloudFront origin
read timeout so a slow answer degrades in-app instead of at the edge. Observed
live success against the free tier is well under half; treat live generation as
a demonstration of capability, not as a dependency.

## Provider contract

P0 implements one provider and a replay provider:

```ts
interface LLMProvider {
  generate<T>(input: {
    schemaName: string;
    jsonSchema: object;
    system: string;
    context: unknown;
    timeoutMs: number;
    maxOutputTokens: number;
    cacheKey?: string;
  }): Promise<{
    value: T;
    usage: {
      inputTokens: number;
      outputTokens: number;
      cachedInputTokens?: number;
    };
    latencyMs: number;
    providerRequestId?: string;
  }>;
}
```

The model has no tools, filesystem access, database access or side effects.

## Input contract

```ts
type GenerationRequest = {
  workshopDomainId: string;
  objectiveId: string;
  pedagogyTemplateId: string;
  gradeLevel: number;
  ageRange: { min: number; max: number };
  durationMinutes: number;
  classSize: number;
  preferredGroupSize: number;
  availableMaterialIds: string[];
  strictInventory: boolean;
  budget: {
    amount: number | null;
    hardCap: boolean;
  };
  hasInternet: boolean;
  hasElectricity: boolean;
  accessibilityNeeds: string[];
  classroomContext?: string;
  idempotencyKey: string;
};
```

All IDs must resolve to approved reference data before a run is created.

## Output contract

```ts
type StageOutput = {
  stageId: string;
  activityTemplateId: string;
  objectiveIds: string[];
  title: string;
  drivingQuestion: string;
  teacherInstructions: string[];
  studentInstructions: string[];
  filledParameters: Record<string, string | number | boolean>;
  materials: Array<{
    materialId: string;
    quantityPerGroup: number;
    necessity: "required" | "optional";
    approvedSubstituteIds: string[];
  }>;
  differentiation: {
    support: string[];
    extension: string[];
    accessibilityAdaptations: string[];
  };
  assessment: {
    prompt: string;
    expectedEvidence: string[];
  };
  mediaRecommendations: Array<{
    type: "visual" | "animation" | "video" | "simulation";
    purpose: string;
    optional: boolean;
  }>;
  rationale: {
    mechanism: string;
    objectiveConnection: string;
  };
};
```

The official objective text is absent from writable output. The server renders
it from the pinned objective row.

## Generation sequence

1. Validate request and pin approved reference versions.
2. Filter activity/game candidates using hard constraints.
3. Ask the model for a workshop-level selection and rationale over fixed stages.
4. Rebalance time, group counts, quantities and cost deterministically.
5. Generate stage details in parallel, maximum concurrency three.
6. Validate static output and the selected template's dynamic parameter schema.
7. Apply code repairs for arithmetic and derived fields.
8. Perform at most one targeted re-prompt for remaining semantic blockers.
9. Mark unrepaired stages failed and expose them to manual correction.
10. Assemble a draft only after all required stages pass.

## Prompt construction

Keep the stable prefix first for provider caching:

1. Product and safety policy
2. Output schema purpose
3. Pedagogy-stage definitions
4. Approved template descriptions
5. Dynamic objective and request constraints
6. Existing stage output and typed findings for a repair call

User-controlled text must be placed in explicit data delimiters and described
as untrusted context, not instructions.

## Konu Kilidi invariants

- The workshop topic is immutable for the life of a generation.
- Topics live in their own table, separate from curriculum outcomes. A topic is
  the product's identity; an outcome is an optional mapping onto it.
- A curriculum mapping carries its own verification state. Unverified mappings
  are never displayed as approved — the lock badge reads the recorded state,
  and "locked" has never meant "checked".
- A run pins the topic row, the plan snapshot and a content hash.
- The topic displayed in the UI and export always comes from the database
  snapshot, never from model output.
- For a catalogue topic with no authored session, the model may write the
  session but may not rename the workshop: the published title is the lock.
- Generated student-friendly explanations may paraphrase the concept but may
  not become the canonical topic or outcome text.

## Delivery report invariants

The report is a second AI surface with a narrower contract than generation.

- The model receives only what the educator recorded, with unanswered fields
  already marked "Belirtilmedi", and narrates it.
- It may not invent a participant count, duration or cost; describe a skipped
  stage as delivered; assert unobserved learning; or soften an incident.
- Empty output in any section is rejected as a contract breach.
- The deterministic fallback is not a degraded guess: the facts are already
  written down, so it restates them plainly. A report is never blocked on a
  provider.
- Safety observations occupy their own narrative section, which the public
  library never renders. The public section list is an allow-list, so a
  section added later is private until someone decides otherwise.
- An edited report is the educator's text, and its recorded provenance stops
  being the model's.

## Activity safety

AI selects and parameterizes approved activity templates. It must not invent
unrestricted experiment procedures.

Each activity template defines:

- Grade and age bounds
- Allowed parameters and ranges
- Required and optional materials
- Hazard class
- Supervision and protective-equipment requirements
- Internet/electricity needs
- Duration and group-size bounds
- Accessibility tags
- Approved substitutions
- A parameter JSON Schema

## Game generation

The model selects a game mechanic and fills bounded content slots. Deterministic
React/SVG components control layout.

P0 mechanics:

1. Matching/domino cards
2. Sorting/sequencing cards
3. Prediction-evidence cards

Example slot contract:

```ts
type MatchingGameSlots = {
  pairs: Array<{
    left: string;
    right: string;
  }>; // minimum 8, maximum 12
};
```

## Validator finding

```ts
type ValidatorFinding = {
  code: string;
  severity: "blocker" | "warning" | "info";
  path: string;
  message: string;
  repairability: "code" | "reprompt" | "human";
};
```

## Always-blocking rules

- `OBJECTIVE_UNKNOWN_OR_UNAPPROVED`
- `OBJECTIVE_COVERAGE_GAP`
- `REQUIRED_PEDAGOGY_STAGE_MISSING`
- `ASSESSMENT_EVIDENCE_MISSING`
- `ACTIVITY_TEMPLATE_UNAPPROVED`
- `AGE_SAFETY_BOUND_VIOLATION`
- `HAZARD_OR_SUPERVISION_VIOLATION`
- `REQUIRED_POWER_UNAVAILABLE`
- `REQUIRED_INTERNET_UNAVAILABLE`
- `REQUIRED_MATERIAL_UNAVAILABLE`
- `NO_APPROVED_SUBSTITUTE`
- `GROUP_CAPACITY_MISMATCH`
- `GAME_SLOT_SCHEMA_INVALID`
- `PRINT_LAYOUT_INVALID`
- `OUTPUT_SCHEMA_INVALID`

## Conditional blockers

- `BUDGET_EXCEEDED` when the budget is a hard cap
- `DURATION_UNRESOLVABLE` when legal rebalancing is impossible

## Warnings

- `OPTIONAL_MATERIAL_UNAVAILABLE`
- `PURCHASE_SUGGESTED`
- `ACCESSIBILITY_IMPROVEMENT`
- `EXCESSIVE_PREPARATION`
- `GENERIC_OUTPUT`
- `ACTIVITY_REPETITION`
- `OFFLINE_MEDIA_UNAVAILABLE`
- `DURATION_ESTIMATE_UNCERTAIN`

## Repair policy

Code repairs:

- Duration arithmetic
- Group counts
- Material quantities
- Cost totals
- Approved substitutions
- Derived labels and ordering

One targeted model repair is permitted for:

- Age-inappropriate wording
- Generic instructions
- Missing differentiation
- Weak objective explanation
- Incomplete assessment evidence

If the targeted repair fails, the stage becomes `failed`; it does not enter an
automatic loop.

