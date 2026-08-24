# Codex–Claude collaboration protocol

  Codex is the primary agent and final decision-maker.

  For brainstorming, architecture, product strategy, or other substantial
  open-ended decisions:

  1. Codex develops an initial position.
  2. Consult Claude using the installed Claude Code CLI in non-interactive,
     read-only plan mode.
  3. Give Claude the user's requirements, Codex's current proposal, assumptions,
     and unresolved questions.
  4. Ask Claude to challenge the proposal, identify weaknesses, and suggest
     concrete alternatives.
  5. Codex evaluates the critique and revises the proposal.
  6. Repeat only when material disagreements remain, with a maximum of four
     consultation rounds.
  7. Codex owns the final decision and presents one coherent answer to the user.

  Claude is a consultant, not an implementation agent:
  - Claude must not edit files or execute project-changing actions.
  - Do not blindly accept Claude's recommendations.
  - Record important disagreements and explain the final tradeoff when relevant.
  - Stop debating once the result satisfies the user's requirements and remaining
    disagreements would not materially improve it.

  Use a command shaped like:

  claude -p \
    --permission-mode plan \
    --no-session-persistence \
    --model opus \
    "<consultation prompt>"

