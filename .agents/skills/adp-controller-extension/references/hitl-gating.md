# Confidence & HITL Gating

> Referenced from [SKILL.md](../SKILL.md). The workflow steps refer back here for thresholds and rules.

Three steps in this workflow are AI judgment calls, not deterministic lookups: control selection (Step 4), action selection (Step 5), and payload preparation (Step 8). Wrong choices at these points either edit the wrong UI or silently corrupt the change. To make HITL reliable, **rate every such decision with a self-assessed confidence in `[0, 1]`** and gate behavior on per-decision thresholds.

## Confidence rubric

Anchor your self-rating to evidence, not vibes:

| Confidence | When to assign it |
|---|---|
| **0.95–1.00** | Exact, unambiguous match. Single candidate. Wording in the user's instruction maps 1:1 to one option. |
| **0.85–0.94** | Strong match. Top candidate is clearly best; runner-up is materially worse. All required fields derived from explicit context or instructions. |
| **0.65–0.84** | Likely match. Top candidate is plausible but the runner-up is also reasonable, or one non-critical field had to be inferred. |
| **0.40–0.64** | Weak match. Several plausible candidates, or a required field was inferred from weak signals. |
| **< 0.40** | No real match. Don't pick — list options and ask. |

## Three bands → three behaviors

| Band | Range | Behavior |
|---|---|---|
| **High** | ≥ high threshold | Proceed silently. Record the choice + confidence in the final summary. |
| **Medium** | ask threshold ≤ x < high threshold | Proceed but **announce** the choice on one line: `Using <choice> (confidence 0.78). Continuing — interrupt to change.` Do not stop. |
| **Low** | < ask threshold | **Stop and ask.** Present the top 2–3 ranked candidates with their confidences. Never guess. |

## Medium-band lock-in (critical)

A Medium-band announcement is a **soft commitment, not a draft**. The next tool call must use the announced choice exactly. If downstream evidence later invalidates the choice — for example, the overlay's `actionIds` doesn't contain the action you expected, `get_context` returns a structure that doesn't match, or the action call errors — you MUST:

1. **Stop.** Do not silently switch to a different control, action, or payload. The user already saw "Using X" and is reasonably expecting X.
2. **Report the contradiction explicitly:** what you announced, what came back, and what that means.
3. **Ask the user how to proceed.** Offer concrete alternatives where possible (e.g. "(a) try a different control, (b) use a different action on the same control, (c) stop").

Silently revising a Medium-band choice is the single worst HITL failure mode this skill protects against. The user's "interrupt to change" affordance is real-time only; once you've moved past it, ask explicitly before changing course.

## Expected-action absence is a hard stop

When you derived an expected action id in Step 5 from the user's intent (e.g. "add a button" → `CTX_ADDXML`) and the chosen control doesn't expose that action, **this is an ask point, not a search heuristic**. Do not silently iterate to a different control hoping the action appears. Instead:

1. **Stop.** Tell the user, in plain terms, that the control they're working with doesn't support the action needed for this intent. Name the control and the missing action explicitly.
2. **Propose a similar control if one exists.** Look at the overlay list for candidates of the same or compatible `controlType` (e.g. another `OverflowToolbar`, another `Toolbar`, the parent container) and name **one specific alternative** with the reason it's similar. Do not list five — pick the closest one.
3. **Wait for explicit confirmation.** Do not switch controls until the user replies. If they confirm, restart from Step 5 (action selection) on the new control and verify the expected action is present *before* announcing.
4. **If no similar control is obvious**, ask the user to point at one or to clarify what they meant — don't guess.

This rule has special weight when the **user explicitly named the control** (e.g. "add a button to the TableToolbar"). In that case the model must not silently substitute a different control under any circumstance — the user said which one, and a missing action means the request itself is impossible as stated, which the user must be told.

This rule applies even when the chosen control was selected in the High band. A High-band control plus an unexpected action set is a higher-priority signal than the original control-selection confidence.

Phrasing template:

> The `<chosenControl>` (`<controlType>`) doesn't expose `<expectedAction>` — only `<actual ids>`.
>
> The closest similar control on this page is `<proposedControl>` (`<controlType>`), because `<reason>`. Should I switch to `<proposedControl>` and continue, or did you mean a different control?

## Per-decision thresholds

| Decision | High ≥ | Ask < | Reasoning |
|---|---|---|---|
| Step 4 — Control selection | 0.95 | 0.60 | Cheap to undo if wrong (the action will fail or look obviously wrong). |
| Step 5 — Action selection | 0.85 | 0.65 | Few options, usually obvious; bump slightly higher because the wrong action causes a wrong *kind* of change. |
| Step 8 — Payload preparation | 0.90 | 0.70 | **Highest risk.** Action can succeed yet produce a broken/misplaced change. Bias toward asking. |

## Ambiguity overrides confidence (must ask)

The Medium band is for "I know which one and the runner-up is materially worse, but not by a wide margin." It is **not** for "two candidates look interchangeable." When two or more candidates are roughly equally plausible — same `controlType`, similar labels, both reasonable matches for the user's words — that is a **disambiguation problem, not a confidence problem**. Treat it as a hard ask regardless of the score:

- Two or more candidates within **0.10** confidence of each other → **stop and ask**, even if the top score is in the High band on paper.
- "I'll pick the more conventional one" or "this is where row actions live" reasoning is not a tiebreaker — it's a guess. List the candidates and ask.

Concrete example: a ListReport page has both a `TableToolbar` and a `FooterToolbar`. The user said "the toolbar." Both are `sap.m.OverflowToolbar`. Don't pick — ask.

## Required-field rule (Step 8)

A required field whose value cannot be derived from (a) the action's payload schema, (b) the element context, or (c) explicit user instructions **caps the whole-payload confidence at 0.55** regardless of how strong the other fields are. That puts payload prep into the "ask" band by default whenever guessing is required.

## Multi-change runs

When executing many changes in one session, the cumulative chance of a wrong silent decision grows. **For runs with more than 3 changes, be more conservative: prefer announcing choices rather than proceeding silently, and always re-run `get_overlays` between iterations — confidence drops if the snapshot is stale.**

## Reporting

The final summary (Step 14) must include, per change: chosen control, action, and the confidence the model assigned to each AI decision. This makes silent high-confidence decisions auditable after the fact.
