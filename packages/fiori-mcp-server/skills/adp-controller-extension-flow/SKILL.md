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
| `get_overlays` | required | — | `{ overlays: Overlay[] }` |
| `get_actions` | required | `{ controlId }` | `{ actions: Action[] }` |
| `get_context` | required | `{ controlId, actionId }` | `{ context }` |
| `call_action` | required | `{ controlId, actionId, actionPayload }` | `{ success: boolean }` |
| `save` | required | — | `{ saved: boolean }` |
| `stop` | required | — | `{ stopped: true }` |

`Overlay` = `{ overlayId, controlId, label, controlType }`.
`Action` = `{ id, label?, payload?: [{ name, type, required?, description? }] }`.
For the standard adaptation editor preview iframe, pass `frameId: "preview"` in the `start` payload.

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

If multiple match, ask the user. If none match, present the list and ask. Store the chosen `controlId`.

### Step 4 — Get actions for that control

Call `step: "get_actions"`, payload `{ controlId }`. Returns the action list.

### Step 5 — Select action (AI decision)

Map user intent to one of the returned actions:
- "add a button/field/column" → `addFragment`
- "hide" / "remove" → `remove` (or `hide` if both are offered)
- "rename" / "change label" → `rename`
- "change property" → `changeProperty`
- "move" → `move`

Store `actionId` and the action's `payload` schema.

### Step 6 — Get element context

Call `step: "get_context"`, payload `{ controlId, actionId }`. Returns `viewName`, `controlType`, aggregation info, etc. Used to fill structural payload fields.

### Step 7 — Prepare action payload (AI decision)

Build `actionPayload` from the action's `payload` schema (Step 5), the element context (Step 6), and the user's instructions:
- Fill structural fields (`viewName`, target aggregation, …) from context.
- Fill value fields (label text, property values, …) from instructions.
- For `addFragment`: typically `{ fragmentName, targetAggregation, index }`.
- If a required field can't be derived, ask the user.
- Validate types match the schema.

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

Report to the user: summary of all changes made, files created, any issues encountered.

## Error Handling

| Situation | Action |
|-----------|--------|
| Page not loading | Wait 30 s. If still nothing, verify URL and editor server is running. |
| `start` returns `rtaStarted: false` | Retry once after 3 s. If still false, the app may not support RTA. |
| `get_overlays` returns empty | Wait 5 s, retry. If still empty, ask the user to confirm the editor is on the right view. |
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

1. `start` with `{ site, frameId: "preview" }` → `sessionId` + `rtaStarted: true`
2. `get_overlays` → find the toolbar control
3. `get_actions` for `controlId=<toolbar>` → `addFragment`
4. `get_context` for `(toolbar, addFragment)` → `viewName` etc.
5. `call_action` with `actionPayload: { fragmentName, targetAggregation, index }` → `success: true`
6. `save` → `saved: true`
7. `adp_controller_extension` Phase 1 → knowledge base
8. Generate controller extension + fragment, Phase 2 writes files
9. `stop`, then kill the editor server. Report done.
