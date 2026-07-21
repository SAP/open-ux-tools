---
name: sap-fiori-adp-controller-extension-flow
author: sap-fiori-tools
version: 0.0.1
description: Use when making RTA changes to a SAP Fiori adaptation project via the adaptation editor — adding/removing UI elements, changing properties, renaming labels, hiding controls, or extending controllers and fragments.
---

# ADP Controller Extension Flow

Drive Runtime Authoring (RTA) in the SAP Fiori adaptation editor through the **`run_rta_workflow_step`** MCP tool exposed by `fiori-mcp-server`. The tool handles browser automation server-side; this skill orchestrates the step sequence and the AI decisions between steps.

> **Tool boundary.** `run_rta_workflow_step` is a **skill-internal** dispatcher. Don't call it ad-hoc — the value of this skill is in the AI decision points between steps (control selection, action selection, payload preparation). Calling out of order will fail with a descriptive error.

## Prerequisites

- `fiori-mcp` server running (provides `run_rta_workflow_step`)
- Adaptation editor URL (from the `adp-project-setup` skill or user-provided)
- A Chromium-based browser the server can launch. Resolution order:
  1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env var (absolute path to a Chromium binary)
  2. `PLAYWRIGHT_BROWSER_CHANNEL` env var (`chrome`, `msedge`, `chrome-beta`, etc.)
  3. System Google Chrome (default channel)
  4. Playwright-managed Chromium (auto-fallback if 1–3 fail)

### Chromium fallback (no system Chrome)

If no system Chrome is found and no env override is set, the server falls back to Playwright's bundled Chromium. The bundle is **not** included with `playwright-core`, so it has to be installed once on the host machine:

```bash
npx playwright install chromium
```

When `start` fails with `Executable doesn't exist at .../chromium-XXXX/...`, run that command and retry. Mention to the user that the first install downloads ~120 MB and can take a minute. Subsequent runs reuse the cached browser.

Detection sequence the skill should follow on a `start` failure that mentions a missing browser:
1. Inspect the error message — if it references a missing Chromium binary, prompt the user to run `npx playwright install chromium` (or run it on their behalf if they consent).
2. After install completes, retry `start` with the same payload.
3. If detection still fails, ask the user to set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a known Chrome/Chromium binary.

## Tool Contract

A single tool, dispatched by the `step` argument. Pass `payload` for steps that need it. Subsequent steps reuse the `sessionId` returned by `start`.

| step | sessionId | payload | returns |
|------|-----------|---------|---------|
| `start` | — | `{ site: string, frameId?: string }` | `{ sessionId, rtaStarted: true }` |
| `get_overlays` | required | — | `{ overlays: Overlay[] }` |
| `get_actions` | required | `{ controlId }` | `{ actions: Action[] }` |
| `get_context` | required | `{ controlId, actionId }` | `{ context }` |
| `call_action` | required | `{ controlId, actionId, actionPayload }` | `{ success: boolean }` |
| `save` | required | — | `{ saved: boolean }` |
| `stop` | required | — | `{ stopped: true }` |

`Overlay` = `{ overlayId, controlId, label, controlType }`.
`Action` = `{ id, label?, payload?: [{ name, type, required?, description? }] }`.
For the standard adaptation editor preview iframe, pass `frameId: "preview"` in the `start` payload.

## Actions Reference

These are the canonical RTA actions returned by `get_actions`. **Always pick by `id` from this table — never invent or guess action IDs.** If `get_actions` returns an `id` not listed here, treat it as unknown and ask the user before proceeding.

### `CTX_ADDXML` — Add: Fragment

Insert an XML fragment as a child of the selected control. This is the action for "add a button / field / column / section" via a fragment file.

| Field | Type | Required | Description |
|---|---|---|---|
| `fragmentPath` | string | yes | Path to the fragment XML, formatted `fragments/<Name>.fragment.xml`. |
| `targetAggregation` | string | yes | Aggregation of the parent control where the fragment is inserted (e.g. `content`, `items`, `headerContent`). Read from `get_context`. |
| `index` | int | yes | Position within the aggregation. Use `0` for first, the current child count for "append at end". |

### `CTX_EXTEND_CONTROLLER` — Extend Controller

Attach a controller extension JS file to a view. Use this when fragment event handlers reference methods that need a JS implementation, or whenever the user asks for behavior changes (handlers, lifecycle hooks, formatters).

| Field | Type | Required | Description |
|---|---|---|---|
| `codeRef` | string | yes | Path to the controller extension, formatted `coding/<Name>.js`. |
| `viewId` | string | yes | Any control id inside the view, or the view id itself. The `controlId` of the current selection works. |
| `instanceSpecific` | boolean | no | `true` extends only this view instance; `false`/omitted extends every view that uses this controller. |

### Disambiguation by intent

| User intent | Action |
|---|---|
| "add a button / field / column / section / dialog opener" | `CTX_ADDXML` (fragment carries the new control) |
| "make this button do X" / "open a dialog when …" / "change behavior" | `CTX_EXTEND_CONTROLLER` (handler lives in the controller extension) |
| "add a button that opens a dialog" | **Both**, in this order: `CTX_ADDXML` for the button, then `CTX_EXTEND_CONTROLLER` for the press handler. Run as two separate iterations of Steps 4–8. |

If `get_actions` returns more actions than these for a control, surface them to the user rather than picking — this skill is only authoritative for `CTX_ADDXML` and `CTX_EXTEND_CONTROLLER`.

## Confidence & HITL Gating

Three steps in this workflow are AI judgment calls, not deterministic lookups: control selection (Step 3), action selection (Step 5), and payload preparation (Step 7). Wrong choices at these points either edit the wrong UI or silently corrupt the change. To make HITL reliable, **rate every such decision with a self-assessed confidence in `[0, 1]`** and gate behavior on per-decision thresholds.

### Confidence rubric

Anchor your self-rating to evidence, not vibes:

| Confidence | When to assign it |
|---|---|
| **0.95–1.00** | Exact, unambiguous match. Single candidate. Wording in the user's instruction maps 1:1 to one option. |
| **0.85–0.94** | Strong match. Top candidate is clearly best; runner-up is materially worse. All required fields derived from explicit context or instructions. |
| **0.65–0.84** | Likely match. Top candidate is plausible but the runner-up is also reasonable, or one non-critical field had to be inferred. |
| **0.40–0.64** | Weak match. Several plausible candidates, or a required field was inferred from weak signals. |
| **< 0.40** | No real match. Don't pick — list options and ask. |

### Three bands → three behaviors

| Band | Range | Behavior |
|---|---|---|
| **High** | ≥ high threshold | Proceed silently. Record the choice + confidence in the final summary. |
| **Medium** | ask threshold ≤ x < high threshold | Proceed but **announce** the choice on one line: `Using <choice> (confidence 0.78). Continuing — interrupt to change.` Do not stop. |
| **Low** | < ask threshold | **Stop and ask.** Present the top 2–3 ranked candidates with their confidences. Never guess. |

### Medium-band lock-in (critical)

A Medium-band announcement is a **soft commitment, not a draft**. The next tool call must use the announced choice exactly. If downstream evidence later invalidates the choice — for example, `get_actions` doesn't return the action you expected, `get_context` returns a structure that doesn't match, or the action call errors — you MUST:

1. **Stop.** Do not silently switch to a different control, action, or payload. The user already saw "Using X" and is reasonably expecting X.
2. **Report the contradiction explicitly:** what you announced, what came back, and what that means.
3. **Ask the user how to proceed.** Offer concrete alternatives where possible (e.g. "(a) try a different control, (b) use a different action on the same control, (c) stop").

Silently revising a Medium-band choice is the single worst HITL failure mode this skill protects against. The user's "interrupt to change" affordance is real-time only; once you've moved past it, ask explicitly before changing course.

### Expected-action absence is a hard stop

When you derived an expected action id in Step 5 from the user's intent (e.g. "add a button" → `CTX_ADDXML`) and the chosen control doesn't expose that action, **this is an ask point, not a search heuristic**. Do not silently iterate to a different control hoping the action appears. Instead:

1. **Stop.** Tell the user, in plain terms, that the control they're working with doesn't support the action needed for this intent. Name the control and the missing action explicitly.
2. **Propose a similar control if one exists.** Look at the overlay list for candidates of the same or compatible `controlType` (e.g. another `OverflowToolbar`, another `Toolbar`, the parent container) and name **one specific alternative** with the reason it's similar. Do not list five — pick the closest one.
3. **Wait for explicit confirmation.** Do not switch controls until the user replies. If they confirm, restart from Step 4 (`get_actions`) on the new control and verify the expected action is present *before* announcing.
4. **If no similar control is obvious**, ask the user to point at one or to clarify what they meant — don't guess.

This rule has special weight when the **user explicitly named the control** (e.g. "add a button to the TableToolbar"). In that case the model must not silently substitute a different control under any circumstance — the user said which one, and a missing action means the request itself is impossible as stated, which the user must be told.

This rule applies even when the chosen control was selected in the High band. A High-band control plus an unexpected action set is a higher-priority signal than the original control-selection confidence.

Phrasing template:

> The `<chosenControl>` (`<controlType>`) doesn't expose `<expectedAction>` — only `<actual ids>`.
>
> The closest similar control on this page is `<proposedControl>` (`<controlType>`), because `<reason>`. Should I switch to `<proposedControl>` and continue, or did you mean a different control?

### Per-decision thresholds

| Decision | High ≥ | Ask < | Reasoning |
|---|---|---|---|
| Step 3 — Control selection | 0.80 | 0.60 | Cheap to undo if wrong (the action will fail or look obviously wrong). |
| Step 5 — Action selection | 0.85 | 0.65 | Few options, usually obvious; bump slightly higher because the wrong action causes a wrong *kind* of change. |
| Step 7 — Payload preparation | 0.90 | 0.70 | **Highest risk.** Action can succeed yet produce a broken/misplaced change. Bias toward asking. |

### Ambiguity overrides confidence (must ask)

The Medium band is for "I know which one and the runner-up is materially worse, but not by a wide margin." It is **not** for "two candidates look interchangeable." When two or more candidates are roughly equally plausible — same `controlType`, similar labels, both reasonable matches for the user's words — that is a **disambiguation problem, not a confidence problem**. Treat it as a hard ask regardless of the score:

- Two or more candidates within **0.10** confidence of each other → **stop and ask**, even if the top score is in the High band on paper.
- "I'll pick the more conventional one" or "this is where row actions live" reasoning is not a tiebreaker — it's a guess. List the candidates and ask.

Concrete example: a ListReport page has both a `TableToolbar` and a `FooterToolbar`. The user said "the toolbar." Both are `sap.m.OverflowToolbar`. Don't pick — ask.

### Required-field rule (Step 7)

A required field whose value cannot be derived from (a) the action's payload schema, (b) the element context, or (c) explicit user instructions **caps the whole-payload confidence at 0.55** regardless of how strong the other fields are. That puts payload prep into the "ask" band by default whenever guessing is required.

### Multi-change runs

When executing many changes in one session, the cumulative chance of a wrong silent decision grows. **Lower the high threshold of every decision by 0.05 once the run has > 3 changes** so that the 4th and later changes are announced more aggressively. Always re-run `get_overlays` between iterations — confidence drops if the snapshot is stale.

### Reporting

The final summary (Step 12) must include, per change: chosen control, action, and the confidence the model assigned to each AI decision. This makes silent high-confidence decisions auditable after the fact.

## Workflow

### Step 1 — Start RTA

Call `run_rta_workflow_step` with `step: "start"`, payload `{ site, frameId: "preview" }`. Verify `rtaStarted: true`. Store the returned `sessionId`. On `false`, wait 3 s and retry once.

### Step 2 — Get overlays

Call `step: "get_overlays"`. Returns the editable controls on the page.

### Step 3 — Select target control (AI decision)

Match the user's instruction against the overlays:
- "the title" → controls with `Title` or `Header` in `controlType`
- "the table" → `sap.ui.table.Table` or `sap.m.Table`
- "button X" → `sap.m.Button` with matching label
- "toolbar" → `sap.m.Toolbar` or `sap.m.OverflowToolbar`

**Confidence gating** (see *Confidence & HITL Gating*; thresholds: high ≥ 0.80, ask < 0.60):
- Score every plausible overlay against the instruction; rank them; assign confidence to the top candidate using the rubric.
- **High** → use the chosen `controlId` silently.
- **Medium** → announce: `Using <label> (<controlType>, confidence 0.7x). Continuing — interrupt to change.`
- **Low** or no candidates ≥ 0.40 → list the top 3 with confidences and ask.

Store the chosen `controlId` and its confidence for the final summary.

### Step 4 — Get actions for that control

Call `step: "get_actions"`, payload `{ controlId }`. Returns the action list.

### Step 5 — Select action (AI decision)

Pick an action by `id` from the **Actions Reference** above. **Never invent an action id**; if `get_actions` returns an id that isn't in the reference, ask the user.

Map user intent (see *Disambiguation by intent* in the reference):
- "add a button/field/column/section" → `CTX_ADDXML`
- "make X happen on click", "open a dialog", "change behavior" → `CTX_EXTEND_CONTROLLER`
- "add a button that does X" → both (run as two iterations).

**Confidence gating** (thresholds: high ≥ 0.85, ask < 0.65):
- **Schema-inspection prerequisite for High band:** Before assigning ≥ 0.85, you must have read the candidate's `payload` schema (from `get_actions`) and confirmed it matches the kind of operation the user described. If you have not inspected the schema, cap confidence at **0.65** (medium → announce, do not run silently).
- **Same-verb penalty:** If two or more candidates share a verb token in their id or label (e.g. multiple `ADD_*` actions returned), subtract **0.20** from the top candidate's confidence unless the schemas clearly distinguish them.
- **High-band requirement:** When proceeding silently, record an `Alternatives considered:` line stating which other actions were rejected and the schema/semantic reason. If you can't articulate the discriminator, the choice isn't High.
- If the verb doesn't map cleanly (e.g. "tweak the toolbar"), confidence is low — list the available actions with their labels and ask.

Store `actionId`, the action's `payload` schema, and the confidence value.

### Step 6 — Get element context

Call `step: "get_context"`, payload `{ controlId, actionId }`. Returns `viewName`, `controlType`, aggregation info, etc. Used to fill structural payload fields.

### Step 7 — Prepare action payload (AI decision)

Build `actionPayload` from the action's `payload` schema (Step 5), the element context (Step 6), and the user's instructions. **Use the exact field names from the Actions Reference** — `fragmentPath` (not `fragmentName`), `codeRef`, `viewId`, etc.

**For `CTX_ADDXML`:**
- `fragmentPath`: `fragments/<Name>.fragment.xml` — pick `<Name>` from the user's intent (e.g. `OrderDetailsButton`). The fragment file itself is created in Step 11.
- `targetAggregation`: from `get_context` (e.g. `content` for a Toolbar).
- `index`: `0` for "at the beginning"; the current child count for "at the end"; ask if the user said "after the X" and the position isn't determinable from context.

**For `CTX_EXTEND_CONTROLLER`:**
- `codeRef`: `coding/<Name>.js` — `<Name>` typically matches the fragment's controller name (e.g. `OrderDetailsExt`). The JS file itself is created in Step 11.
- `viewId`: the `controlId` of the current selection works; otherwise the view id from `get_context`.
- `instanceSpecific`: omit unless the user explicitly asked to scope to one instance.

General rules:
- Fill structural fields from `get_context`; fill value fields from instructions.
- Validate types match the schema (string vs int vs boolean — `index` is int, not string).

**Confidence gating** (thresholds: high ≥ 0.90, ask < 0.70 — strictest of the three because a successful `call_action` with a wrong payload is the worst silent failure):
- Per-field confidence: use the rubric. Whole-payload confidence is the **minimum** of the per-field values.
- **Required-field rule:** a required field whose value cannot be derived from schema, context, or explicit instruction caps whole-payload confidence at **0.55** — push to the ask band even if every other field is perfect.
- **High** → submit the payload silently.
- **Medium** → announce the payload: `Action <actionId> with payload <JSON> (confidence 0.7x). Continuing — interrupt to change.` Continue.
- **Low** → present the payload as a draft and ask for confirmation or corrections before calling.

Store the payload + confidence for the final summary.

### Step 8 — Execute action

Call `step: "call_action"`, payload `{ controlId, actionId, actionPayload }`. On `success: true`, continue. On error, report and offer to retry with adjusted parameters.

### Step 9 — Loop for multiple changes

If the user requested multiple changes, repeat Steps 2–8 once per change (the UI may have changed, so re-run `get_overlays` between changes). If a single request implies multiple operations (e.g. "add a button that calls a function" = fragment + controller extension), execute each as a separate iteration.

Create all changes before saving.

### Step 10 — Save

Call `step: "save"`. Returns `{ saved: true }` on success.

### Step 11 — Generate fragment and controller extension content

After saving, use `mcp__fiori-mcp__adp_controller_extension` to fill in the content for any fragments and controller extensions that were created.

**Phase 1 — knowledge base.** Call with:
- `appPath`: adaptation project path
- `prompt`: describe the functionality (from user instructions)
- (do **not** pass `aiResponse`)

This returns project context, layer info, namespace rules, and existing files.

**Phase 2 — write content.** Generate controller extension and fragment XML using the Phase 1 knowledge base, then call again with:
- `appPath`: same path
- `prompt`: same prompt
- `aiResponse`: your generated code with `**Path:**` markers
- `controllerName`: the controller extension name

Format:

```
**Path:** webapp/changes/coding/MyExtension.js
```javascript
// controller extension code
```

**Path:** webapp/changes/fragments/MyFragment.fragment.xml
```xml
<!-- fragment code -->
```
```

Include XML comments inside fragments for context hints:
```xml
<!-- viewName: <from context> -->
<!-- controlType: <from context> -->
<!-- targetAggregation: <from context> -->
```

### Step 12 — Cleanup

Call `step: "stop"`. The server closes the session; if it was the last one, the browser shuts down too.

Then kill the editor server:

```
kill <processId>
# or by port:
lsof -ti:<port> | xargs kill
```

Report to the user: summary of all changes made, files created, any issues encountered, **plus the confidence the model assigned to each AI decision (control selection, action selection, payload prep) for every change** — this makes silent high-confidence decisions auditable after the fact.

## Error Handling

| Situation | Action |
|-----------|--------|
| Page not loading | Wait 30 s. If still nothing, verify URL and editor server is running. |
| `start` returns `rtaStarted: false` | Retry once after 3 s. If still false, the app may not support RTA. |
| `get_overlays` returns empty | Wait 5 s, retry. If still empty, ask the user to confirm the editor is on the right view. |
| Expected action id is not in the `get_actions` result | **Stop.** This is the hard-stop case from *Confidence & HITL Gating*. Do not silently switch controls or actions. Tell the user what you expected, what came back, and ask how to proceed. |
| Action execution fails | Report error, offer retry with different params. |
| Save fails | Report error. Inform user changes may be lost. |
| `Unknown sessionId` error | The server was restarted between steps. Start a fresh session from Step 1. |
| `Frontend action ... not registered` | The editor hasn't finished loading, or wrong frame. Verify `frameId: "preview"` and retry. |
| `Executable doesn't exist at .../chromium-...` or `browserType.launch: ...` referencing a missing browser | No system Chrome and no Playwright Chromium installed. Run `npx playwright install chromium` (one-time, ~120 MB) and retry `start`. |
| `Chromium executable not found` (custom message from the server) | Same as above — Playwright Chromium isn't installed and no system Chrome was found. Install via `npx playwright install chromium`. |

## Multi-Change Strategy

When the user requests multiple changes:
1. Parse all intended changes upfront.
2. Execute Steps 2–8 once per change, all under the same `sessionId`.
3. Save once at the end (Step 10).
4. If one change fails, save the successful ones and report which failed.
5. Generate content for all fragments / extensions together in Step 11.
6. Stop the session (Step 12) only after everything is done.

## Example Session

User: "Add a custom button to the object page toolbar that shows a dialog with order details."

This intent maps to **two actions** (see *Disambiguation by intent*): `CTX_ADDXML` for the button, then `CTX_EXTEND_CONTROLLER` for the press handler.

1. `start` with `{ site, frameId: "preview" }` → `sessionId` + `rtaStarted: true`
2. `get_overlays` → find the toolbar control (confidence 0.88 → High → silent)
3. `get_actions` for `controlId=<toolbar>` → confirms `CTX_ADDXML` and `CTX_EXTEND_CONTROLLER` are available
4. **Iteration 1 — add the button:**
   - `get_context` for `(<toolbar>, CTX_ADDXML)` → returns `viewName`, current `content` aggregation, child count
   - Action confidence 0.92 (High; alternatives considered: only fragment-add was returned)
   - Payload `{ fragmentPath: "fragments/OrderDetailsButton.fragment.xml", targetAggregation: "content", index: <count> }` confidence 0.91 → High
   - `call_action` → `success: true`
5. **Iteration 2 — add the controller extension:**
   - `get_actions` for the same control still includes `CTX_EXTEND_CONTROLLER`
   - `get_context` for `(<toolbar>, CTX_EXTEND_CONTROLLER)` → returns `viewId`
   - Payload `{ codeRef: "coding/OrderDetailsExt.js", viewId: "<viewId>" }` confidence 0.93 → High
   - `call_action` → `success: true`
6. `save` → `saved: true`
7. `adp_controller_extension` Phase 1 → knowledge base
8. Generate fragment XML (`OrderDetailsButton.fragment.xml`) + controller extension (`OrderDetailsExt.js` with the press handler that opens the dialog), Phase 2 writes files
9. `stop`, then kill the editor server. Report done — including the confidence the model assigned to each AI decision.
