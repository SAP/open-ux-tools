---
name: adp-controller-extension-flow
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
| `get_page_actions` | required | — | `{ registered: RegisteredPageAction[], interactive: InteractiveElement[], interactiveTruncated?: true }` |
| `call_page_action` | required | `{ id }` | `{ result: PageActionRunResult }` |
| `press_interactive` | required | `{ controlId }` | `{ result: PageActionRunResult }` |
| `get_overlays` | required | — | `{ overlays: Overlay[], actionsCatalog: { [actionId]: Action } }` |
| `get_context` | required | `{ controlId, actionId }` | `{ context }` |
| `call_action` | required | `{ controlId, actionId, actionPayload }` | `{ success: boolean }` |
| `save` | required | — | `{ saved: boolean }` |
| `stop` | required | — | `{ stopped: true }` |

`Overlay` = `{ overlayId, controlId, label, controlType, parentElementId, parentAggregationName, index?, actionIds: string[] }` — `index` is the 0-based position within `parentAggregationName` and is omitted when the parent/aggregation can't be resolved or the aggregation is single-cardinality. `actionIds` lists the RTA actions available on this overlay; rich metadata for each id is in the top-level `actionsCatalog`.
`Action` = `{ id, label, description?, parameters: [{ name, type, required?, description? }] }` — keyed by `actionId` in `actionsCatalog`. The catalog is **deduplicated across all overlays** in a single `get_overlays` response, so an id appears once even when many overlays expose it.
`RegisteredPageAction` = `{ id, layer: "framework"|"app", label, description }` — high-level page actions contributed by the framework or app (e.g. `loadData`, `navigateToRow`, `navigateToSection`, `navigateBack`). Only currently-applicable actions are returned.
`InteractiveElement` = `{ controlId, controlType, label, kind: "button"|"input"|"listItem"|"tab"|"link"|"other" }` — best-effort scan of press-able controls in the live view (root view + static area + open dialogs). `interactiveTruncated: true` on the response means the scan cap (100) was hit and more candidates exist than were returned; surface this to the user when the entry they want isn't in the list rather than concluding it doesn't exist.
`PageActionRunResult` = `{ status: "ok", note?, data? } | { status: "needs_user_action", reason }`.
- On `press_interactive`, `note` describes the observable change detected after the click (`"registered actions changed"`, `"ObjectPage section changed"`, `"navigation occurred"`, `"dialog/popover opened or closed"`, `"focus moved"`) or `"no observable state change"`. The detector probes at 200 / 400 / 800 ms after the click (cumulative ~1.4 s); a `"no observable state change"` result means *the press didn't move any of those signals within that window*, not that the press failed. It is a soft hint, not an error — re-check `get_page_actions` / `get_overlays` if you expected a context change.
- On `call_page_action`, `needs_user_action` covers two cases: (a) the action's own `run()` returned that envelope because a precondition (e.g. mandatory filter not set, value help required) can't be met, *or* (b) `run()` *threw* and the server converted the throw into `needs_user_action` with the error message as `reason`. The two are indistinguishable from the surface — if `reason` reads like an exception (`TypeError: …`, `Cannot read property …`), treat it as a runtime error rather than a user-resolvable precondition.

For the standard adaptation editor preview iframe, pass `frameId: "preview"` in the `start` payload.

> **When to reach for the page-action steps.** The six RTA steps (`get_overlays` → … → `save`) assume the page is already showing the control to edit. In Fiori Elements apps that often isn't true on first load — a List Report shows no rows until "Go" is pressed; an Object Page is only reachable after picking a row. Use `get_page_actions` / `call_page_action` / `press_interactive` to drive these pre-RTA navigations from the skill instead of asking the user to click manually. See **Step 2 — Navigate the app** below.

## Actions Reference

These are the canonical RTA actions surfaced through each overlay's `actionIds` (and detailed in the `actionsCatalog` returned alongside `get_overlays`). **Always pick by `id` from this table — never invent or guess action IDs.** If `actionsCatalog` contains an `id` not listed here, treat it as unknown and ask the user before proceeding.

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
| "add a button that opens a dialog" | **Both**, in this order: `CTX_ADDXML` for the button, then `CTX_EXTEND_CONTROLLER` for the press handler. Run as two separate iterations of Steps 4–9. |

If the `actionsCatalog` exposes more actions than these for a control, surface them to the user rather than picking — this skill is only authoritative for `CTX_ADDXML` and `CTX_EXTEND_CONTROLLER`.

## Confidence & HITL Gating

Three steps in this workflow are AI judgment calls, not deterministic lookups: control selection (Step 4), action selection (Step 5), and payload preparation (Step 8). Wrong choices at these points either edit the wrong UI or silently corrupt the change. To make HITL reliable, **rate every such decision with a self-assessed confidence in `[0, 1]`** and gate behavior on per-decision thresholds.

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

A Medium-band announcement is a **soft commitment, not a draft**. The next tool call must use the announced choice exactly. If downstream evidence later invalidates the choice — for example, the overlay's `actionIds` doesn't contain the action you expected, `get_context` returns a structure that doesn't match, or the action call errors — you MUST:

1. **Stop.** Do not silently switch to a different control, action, or payload. The user already saw "Using X" and is reasonably expecting X.
2. **Report the contradiction explicitly:** what you announced, what came back, and what that means.
3. **Ask the user how to proceed.** Offer concrete alternatives where possible (e.g. "(a) try a different control, (b) use a different action on the same control, (c) stop").

Silently revising a Medium-band choice is the single worst HITL failure mode this skill protects against. The user's "interrupt to change" affordance is real-time only; once you've moved past it, ask explicitly before changing course.

### Expected-action absence is a hard stop

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

### Per-decision thresholds

| Decision | High ≥ | Ask < | Reasoning |
|---|---|---|---|
| Step 4 — Control selection | 0.95 | 0.60 | Cheap to undo if wrong (the action will fail or look obviously wrong). |
| Step 5 — Action selection | 0.85 | 0.65 | Few options, usually obvious; bump slightly higher because the wrong action causes a wrong *kind* of change. |
| Step 8 — Payload preparation | 0.90 | 0.70 | **Highest risk.** Action can succeed yet produce a broken/misplaced change. Bias toward asking. |

### Ambiguity overrides confidence (must ask)

The Medium band is for "I know which one and the runner-up is materially worse, but not by a wide margin." It is **not** for "two candidates look interchangeable." When two or more candidates are roughly equally plausible — same `controlType`, similar labels, both reasonable matches for the user's words — that is a **disambiguation problem, not a confidence problem**. Treat it as a hard ask regardless of the score:

- Two or more candidates within **0.10** confidence of each other → **stop and ask**, even if the top score is in the High band on paper.
- "I'll pick the more conventional one" or "this is where row actions live" reasoning is not a tiebreaker — it's a guess. List the candidates and ask.

Concrete example: a ListReport page has both a `TableToolbar` and a `FooterToolbar`. The user said "the toolbar." Both are `sap.m.OverflowToolbar`. Don't pick — ask.

### Required-field rule (Step 8)

A required field whose value cannot be derived from (a) the action's payload schema, (b) the element context, or (c) explicit user instructions **caps the whole-payload confidence at 0.55** regardless of how strong the other fields are. That puts payload prep into the "ask" band by default whenever guessing is required.

### Multi-change runs

When executing many changes in one session, the cumulative chance of a wrong silent decision grows. **Lower the high threshold of every decision by 0.05 once the run has > 3 changes** so that the 4th and later changes are announced more aggressively. Always re-run `get_overlays` between iterations — confidence drops if the snapshot is stale.

### Reporting

The final summary (Step 13) must include, per change: chosen control, action, and the confidence the model assigned to each AI decision. This makes silent high-confidence decisions auditable after the fact.

## Workflow

### Step 1 — Start RTA

Call `run_rta_workflow_step` with `step: "start"`, payload `{ site, frameId: "preview" }`. Verify `rtaStarted: true`. Store the returned `sessionId`. On `false`, wait 3 s and retry once.

### Step 2 — Navigate the app to the editing target

The RTA flow assumes the control to edit is already on screen. For Fiori Elements apps this often isn't true on first load — a List Report shows no rows until the Filter Bar search is triggered; an Object Page is only reachable after picking a row. Drive that navigation through the page-action steps before reaching for `get_overlays`.

Call `step: "get_page_actions"`. The result has two arrays:

- `registered`: high-level, semantic actions contributed by the framework / app (e.g. `loadData`, `navigateToRow`, `navigateToSection`, `navigateBack`). Each entry is currently applicable — actions whose preconditions don't hold are filtered out server-side.
- `interactive`: a best-effort scan of press-able elements (buttons, list items, tabs, …) in the live view + static area + open dialogs. Use this only when nothing in `registered` fits.

**Decision order (always prefer registered over interactive):**

1. **Match user intent against `registered`.** If a registered action matches the navigation step you need (e.g. user said "the order details page" and you're on a List Report → `loadData` then `navigateToRow`), call `step: "call_page_action"` with `payload: { id }`. The action's `run()` resolves only when the page has settled (table loaded, OP rendered).
2. **Handle `needs_user_action`.** If `result.status === "needs_user_action"`, surface `result.reason` to the user — typically a precondition the framework can't satisfy itself (mandatory filter not set, value help required). Wait for them to resolve it, then call `get_page_actions` again.
3. **Fall through to `interactive` only when no registered action fits.** Pick the entry whose `label` and `kind` match the user's words and call `step: "press_interactive"` with `payload: { controlId }`. The press uses a real user-gesture click and waits best-effort for the page to change.
4. **Loop.** After each `call_page_action` / `press_interactive`, call `get_page_actions` again. The `registered` set is the live signal that you've moved to a new context — e.g. `navigateToSection` appearing means you're now on an Object Page. Repeat until the editing target is reachable.

**When to skip Step 2.** If `get_overlays` already returns the control the user named (the page is on the right view from the start), skip to Step 3. The page-action loop is for navigation, not for editing.

**`interactive` is a fallback, not the primary path.** A registered action wraps the framework's own knowledge of "what does it mean to load data here"; an interactive press is a generic click. Reach for `press_interactive` only when (a) `registered` is empty for what you need, *or* (b) `call_page_action` returned `needs_user_action` for a reason the user is unlikely to resolve themselves (e.g. a confirmation dialog only the LLM can read).

**Page-action confidence is shallow.** Picking from `registered` is usually unambiguous (small set, semantic ids). Picking from `interactive` is closer to control selection — apply the same rubric as Step 4 control selection: if two interactive entries are within 0.10 confidence of each other, ask.

### Step 3 — Get overlays

Call `step: "get_overlays"`. Returns the editable controls on the page.

### Step 4 — Select target control (AI decision)

Match the user's instruction against the overlays, examples:
- "the title" → controls with `Title` or `Header` in `controlType`
- "the table" → `sap.ui.table.Table` or `sap.m.Table`
- "button X" → `sap.m.Button` with matching label
- "toolbar" → `sap.m.Toolbar` or `sap.m.OverflowToolbar`

**Template handling**

In RTA, changes are always made on template clones and mapped to the template internally. When you want to change a template of a binding, pick an arbitrary instance and pass it to further steps.

**Data-loaded gate (hard stop for data-bound containers).**

When the target is a `SmartTable`, `SmartList`, `sap.m.Table`, `sap.ui.table.Table`, `SmartChart`, or any control whose intent involves binding to rows/items, you **MUST** confirm row data is loaded before reading the overlay's `actionIds`. Structural overlays (columns, headers, toolbars) are **not** evidence of loaded data — they appear before any rows exist.

Evidence required (one of):
- The user explicitly states data is loaded.
- You observe row-level overlays in `get_overlays` (e.g. `sap.m.ColumnListItem`, `sap.ui.table.Row`, or overlays whose `controlId` contains a row index).

If neither is present, **do not proceed to action selection.** Resolution order:

1. **Prefer the registered page action.** If a previous `get_page_actions` listed `loadData` (or an equivalent app-contributed action) in `registered`, call `step: "call_page_action"` with `payload: { id: "loadData" }`. Its `run()` resolves only after rows are loaded; on `result.status === "ok"`, re-run `get_overlays` and re-check the gate.
2. **Fall back to asking** only if no registered loader is available *and* nothing usable shows up in `interactive` (e.g. a "Go" button). The original ask — "trigger data loading (click Go, apply a filter, expand a node), then I'll re-run `get_overlays`" — still applies as a last resort.

Returning `needs_user_action` from `loadData` (typically because a mandatory filter hasn't been set) is a hard ask: surface the reason and wait for the user to resolve it before re-attempting.

**The gate is unconditional.** It applies even when the change feels purely structural (adding a column, reordering, renaming, changing a header label). Do not reason about whether data "matters" for this particular change — if the target is a data-bound container and row-level overlays are absent, stop. The `actionIds` exposed by an overlay can differ based on data state, and a structurally-correct change against the wrong action variant is exactly the silent failure this skill is built to prevent. "This is just a structural edit, so the gate doesn't apply" is not a valid exception — it is the rationalization the gate exists to block.

Store the chosen `controlId` and its confidence for the final summary.

### Step 5 — Select action (AI decision)

The chosen overlay carries its available action ids in `actionIds`; the rich per-action metadata (label, description, parameters) for each id lives in the top-level `actionsCatalog` returned alongside `get_overlays`. There is no separate `get_actions` step — read both from the Step 3 response.

Pick an action by `id` from the **Actions Reference** above. **Never invent an action id**; if `actionsCatalog` contains an id that isn't in the reference, ask the user.

Map user intent (see *Disambiguation by intent* in the reference):
- "add a button/field/column/section" → `CTX_ADDXML`
- "make X happen on click", "open a dialog", "change behavior" → `CTX_EXTEND_CONTROLLER`
- "add a button that does X" → both (run as two iterations).

**Confidence gating** (thresholds: high ≥ 0.85, ask < 0.65):
- **Schema-inspection prerequisite for High band:** Before assigning ≥ 0.85, you must have read the candidate's `parameters` schema (from `actionsCatalog[actionId]`) and confirmed it matches the kind of operation the user described. If you have not inspected the schema, cap confidence at **0.65** (medium → announce, do not run silently).
- **Same-verb penalty:** If two or more candidates share a verb token in their id or label (e.g. multiple `ADD_*` actions in `actionIds`), subtract **0.20** from the top candidate's confidence unless the schemas clearly distinguish them.
- **High-band requirement:** When proceeding silently, record an `Alternatives considered:` line stating which other actions were rejected and the schema/semantic reason. If you can't articulate the discriminator, the choice isn't High.
- If the verb doesn't map cleanly (e.g. "tweak the toolbar"), confidence is low — list the actions from `actionIds` (with their labels from `actionsCatalog`) and ask.

Store `actionId`, the action's `parameters` schema, and the confidence value.

### Step 6 — Get element context

Call `step: "get_context"`, payload `{ controlId, actionId }`. The response is rich and shapes the rest of the workflow:

- `elementType` — the chosen control's UI5 class.
- `parentAggregationName` — the aggregation slot this control occupies in its parent.
- `actionParameters` — the action's parameter schema (same shape as `actionsCatalog[actionId].parameters`).
- `defaultChildAggregation` (optional) — `{ name, controlType, content: [{ controlId }] }` for the control's default aggregation, listing the current direct children by id. Useful for "insert near child X" intents and as a quick sanity check that the control has the children you expect.
- `aggregationsByClass[]` — per-class breakdown of every aggregation defined on this control's inheritance chain, with `definedIn` + `libraryName`, plus `aggregations[].name`, `controlType`, `contentLength`. **Only populated when the action's parameters reference `aggregation` or `selectedElements`** (the server elides it for actions like rename/remove to keep LLM context small). If you need aggregation info for an action that doesn't take one of those params, the data isn't there — read from `defaultChildAggregation` or re-derive from the control class.
- `availableModels` — the binding environment in effect at this control, keyed by model name. Each entry has `modelName`, `modelClass`, `defaultBindingMode`, `contextPath`, and **`contextEntityType`** (resolved via OData V4 async meta model or V2 sync meta model). Non-OData models with no active binding context on this element are filtered out — they carry no payload-relevant information.
- `actionSpecificContext` — whatever the action's own `getContext` hook returns (action-dependent).

#### Use `availableModels` before reaching for OData metadata

`availableModels[<name>].contextEntityType` already tells you which entity the control is bound to and `contextPath` gives you the OData path. For the common "what is this bound to / what's the entity type here" question that Step 7 (OData metadata) used to answer, **inspect `availableModels` first** — it short-circuits the metadata call entirely. Only fall through to `read_odata_metadata_adp` (Step 7) when you need information `availableModels` can't give you: property-level details, navigation paths, annotation-driven hints, alternative entity sets, or the full EDMX of an unbound area.

#### Looking up aggregation descriptions

`get_context` tells you which aggregations exist (`aggregationsByClass[]`, `parentAggregationName`, `defaultChildAggregation`) and which control defines each one (`definedIn` + `libraryName`), but **not what they're for**. When picking `targetAggregation` for `CTX_ADDXML` (Step 8) you frequently need the aggregation's purpose, allowed type, and cardinality to avoid putting a button into the wrong slot.

Run the bundled script to fetch the aggregation's official UI5 docs:

```bash
node .claude/skills/adp-controller-extension-flow/scripts/lookup-aggregation.mjs \
  --lib <libraryName from aggregationsByClass> \
  --control <definedIn from aggregationsByClass> \
  --aggregation <aggregation name>
```

The script:
- Walks up from `cwd` to find `ui5.yaml` (or pass `--ui5-yaml <path>`) and reads `ui5.url` + `ui5.version` from any `ui5:` block in the proxy/preview middleware config.
- Fetches `<ui5.url>/<version>/test-resources/<lib path>/designtime/api.json` first (configured base + version).
- Falls back through: configured base + latest → `https://ui5.sap.com/<version>/...` → `https://ui5.sap.com/test-resources/...` (latest). Handles 404s on removed versions.
- Caches each api.json for 24 h under `~/.cache/adp-aggregation-lookup/`.
- Prints JSON with `description`, `type`, `cardinality`, `since`, plus a `source` block showing which URL/version actually served the data.

**Always pass the control from `definedIn`, not the leaf control.** The script does not walk the inheritance chain — for an aggregation inherited from `sap.m.FlexBox`, pass `--control sap.m.FlexBox --lib sap.m`, not the SmartTable. `aggregationsByClass[].definedIn` already gives you this.

Use this whenever:
- Picking `targetAggregation` and several look plausible (`content` vs `items` vs `headerContent`).
- Picking `targetAggregation` but none seems plausible with a high enough confidence (you might have selected the wrong control)
- The aggregation's `controlType` doesn't obviously match what you intend to insert (verify the type accepts what your fragment provides).
- You're unsure whether an aggregation is `0..1` (single child — inserting will replace) vs `0..n` (multi — `index` matters).

### Step 7 — Read OData metadata (conditional, only when a data binding is involved)

Run this step only if the user's intention involves binding the element to a data source **and** `availableModels` from Step 6 didn't already answer the question. For the simple "which entity is this control bound to" case, `availableModels[<name>].contextEntityType` is usually enough; reach for the EDMX only when you need richer information (property details, navigation paths, annotations, or entities outside the current binding context).

**IMPORTANT** Call `mcp__fiori-mcp__read_odata_metadata_adp` with the adaptation project path to retrieve the metadata (EDMX) of the OData services available to the application. Always use this tool — do not curl, fetch, or grep EDMX from disk. Use the returned entities, properties, navigation paths, key fields, and annotations as context to decide:

- Which entity set / entity type to bind against
- The exact property name and path (including any navigation traversal)
- Whether the property is suitable for the target control (type, nullability, length)
- Any annotation-driven formatting hints that should be applied

Typical triggers:

- Binding a control property to an OData field (e.g. `text="{Customer/Name}"`)
- Adding a bound text/value/description/title to a control
- Binding a table column or list item to an entity property
- Wiring a new control, fragment, or section to a backing entity set, navigation property, or function import

If the change is purely structural or behavioral (static labels, visibility toggles, controller-only logic, etc.) and does not reference any backing data, skip this step.

Feed these decisions into Step 8 (payload preparation) and into the fragment XML / controller extension content generated in Step 12. If the metadata does not contain a property matching the user's request, stop and ask — do not invent a binding path.

### Step 8 — Prepare action payload (AI decision)

Build `actionPayload` from the action's `parameters` schema (Step 5), the element context (Step 6), and the user's instructions. **Use the exact field names from the Actions Reference** — `fragmentPath` (not `fragmentName`), `codeRef`, `viewId`, etc.

**For `CTX_ADDXML`:**
- `fragmentPath`: `fragments/<Name>.fragment.xml` — pick `<Name>` from the user's intent (e.g. `OrderDetailsButton`). The fragment file itself is created in Step 12.
- `targetAggregation`: from `get_context` (e.g. `content` for a Toolbar). When two aggregations on the same control look plausible (e.g. `content` vs `items`, `customToolbar` vs `headerToolbar`), call the `lookup-aggregation.mjs` script (see Step 6) before picking — getting this wrong inserts the fragment into the wrong slot and `call_action` will still report `success: true`.
- `index`: `0` for "at the beginning"; for "append at end" use the current child count, which is `aggregationsByClass[<class with the aggregation>].aggregations[<aggregation name>].contentLength` from the Step 6 response (fall back to `defaultChildAggregation.content.length` when the aggregation is the default and `aggregationsByClass` wasn't populated). Ask if the user said "after the X" and the position isn't determinable from context.

**For `CTX_EXTEND_CONTROLLER`:**
- `codeRef`: `coding/<Name>.js` — `<Name>` typically matches the fragment's controller name (e.g. `OrderDetailsExt`). The JS file itself is created in Step 12.
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

### Step 9 — Execute action

Call `step: "call_action"`, payload `{ controlId, actionId, actionPayload }`. On `success: true`, continue. On error, report and offer to retry with adjusted parameters.

### Step 10 — Loop for multiple changes

If the user requested multiple changes, repeat Steps 3–9 once per change (the UI may have changed, so re-run `get_overlays` between changes — and re-run `get_page_actions` if a fresh navigation is needed).
A single change request can still require multiple operations and changes to be created.
If a single request implies multiple operations (e.g. "add a button that calls a function" = fragment + controller extension), execute each as a separate iteration.

Create all changes before saving.

### Step 11 — Save

Call `step: "save"`. Returns `{ saved: true }` on success.

### Step 12 — Generate fragment and controller extension content

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

### Step 13 — Cleanup

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
| Expected action id is not in the chosen overlay's `actionIds` | **Stop.** This is the hard-stop case from *Confidence & HITL Gating*. Do not silently switch controls or actions. Tell the user what you expected, what came back, and ask how to proceed. |
| Action execution fails | Report error, offer retry with different params. |
| Save fails | Report error. Inform user changes may be lost. |
| `Unknown sessionId` error | The server was restarted between steps. Start a fresh session from Step 1. |
| `Frontend action ... not registered` | The editor hasn't finished loading, or wrong frame. Verify `frameId: "preview"` and retry. |
| `Executable doesn't exist at .../chromium-...` or `browserType.launch: ...` referencing a missing browser | No system Chrome and no Playwright Chromium installed. Run `npx playwright install chromium` (one-time, ~120 MB) and retry `start`. |
| `Chromium executable not found` (custom message from the server) | Same as above — Playwright Chromium isn't installed and no system Chrome was found. Install via `npx playwright install chromium`. |

## Multi-Change Strategy

When the user requests multiple changes:
1. Parse all intended changes upfront.
2. Execute Steps 3–9 once per change, all under the same `sessionId`.
3. Save once at the end (Step 11).
4. If one change fails, save the successful ones and report which failed.
5. Generate content for all fragments / extensions together in Step 12.
6. Stop the session (Step 13) only after everything is done.

## Example Session

User: "Add a custom button to the object page toolbar that shows a dialog with order details."

This intent maps to **two actions** (see *Disambiguation by intent*): `CTX_ADDXML` for the button, then `CTX_EXTEND_CONTROLLER` for the press handler. The app starts on a List Report, so the Object Page toolbar isn't on screen yet — the page-action loop drives the navigation first.

1. `start` with `{ site, frameId: "preview" }` → `sessionId` + `rtaStarted: true`
2. `get_page_actions` → `registered: [{ id: "loadData", … }]`. The user's target is on the Object Page, so the table needs rows first.
3. `call_page_action({ id: "loadData" })` → `result: { status: "ok" }`. Filter Bar search ran and rows arrived.
4. `get_page_actions` → `registered` now includes `navigateToRow`.
5. `call_page_action({ id: "navigateToRow" })` → `result: { status: "ok" }`. The Object Page is mounted.
6. `get_overlays` → find the toolbar control (confidence 0.88 → High → silent). The overlay's `actionIds` includes `CTX_ADDXML` and `CTX_EXTEND_CONTROLLER`; `actionsCatalog` has the parameter schemas.
7. **Iteration 1 — add the button:**
   - `get_context` for `(<toolbar>, CTX_ADDXML)` → returns `parentAggregationName`, `aggregationsByClass` (with `content.contentLength`), `availableModels`
   - Action confidence 0.92 (High; alternatives considered: only fragment-add was in `actionIds`)
   - Payload `{ fragmentPath: "fragments/OrderDetailsButton.fragment.xml", targetAggregation: "content", index: <contentLength> }` confidence 0.91 → High
   - `call_action` → `success: true`
8. **Iteration 2 — add the controller extension:**
   - The same overlay's `actionIds` still includes `CTX_EXTEND_CONTROLLER`
   - `get_context` for `(<toolbar>, CTX_EXTEND_CONTROLLER)` → returns `viewId`
   - Payload `{ codeRef: "coding/OrderDetailsExt.js", viewId: "<viewId>" }` confidence 0.93 → High
   - `call_action` → `success: true`
9. `save` → `saved: true`
10. `adp_controller_extension` Phase 1 → knowledge base
11. Generate fragment XML (`OrderDetailsButton.fragment.xml`) + controller extension (`OrderDetailsExt.js` with the press handler that opens the dialog), Phase 2 writes files
12. `stop`, then kill the editor server. Report done — including the confidence the model assigned to each AI decision.