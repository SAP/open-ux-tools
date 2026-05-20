---
name: adp-rta-workflow
description: Use when making RTA changes to a SAP Fiori adaptation project via the adaptation editor — adding/removing UI elements, changing properties, renaming labels, hiding controls, or extending controllers and fragments
---

# ADP RTA Workflow

Execute Runtime Authoring (RTA) changes in the SAP Fiori adaptation editor using Playwright browser automation and the `FlexJouleIntegrationApi` UI5 module.

## Prerequisites

- Playwright MCP connected (`mcp__plugin_playwright_playwright__*` tools)
- fiori-mcp server connected (`mcp__fiori-mcp__adp_controller_extension`, `mcp__fiori-mcp__open_adaptation_editor`)
- User has described what UI changes they want

## Required Inputs

This skill needs two pieces of context before it can run:

1. **Adaptation project path** (`appPath`) — absolute path to the adaptation project root (where `package.json` lives).
2. **Editor URL** — the running adaptation editor URL.

### Resolving missing inputs

**If `appPath` is missing:** Ask the user for the absolute path to their adaptation project before proceeding. Do not guess or scan the filesystem — wait for the user to provide it.

**If editor URL is missing (but `appPath` is known):** Open the editor via fiori-mcp before navigating Playwright:

Call `mcp__fiori-mcp__open_adaptation_editor` with:
- `appPath`: the resolved adaptation project path

The tool returns:
- `editorUrl` — full URL to use for `browser_navigate` in Step 1
- `processId` — server PID (track this for cleanup in Step 13)
- `port` — server port

Use the returned `editorUrl` as the navigation target in Step 1. Remember the `processId` and `port` so Step 13 can clean up the server.

## API: FlexJouleIntegrationApi

The adaptation editor exposes a UI5 module at `sap/ui/fl/ai/FlexJouleIntegrationApi` inside the running app's iframe. Load it via `sap.ui.require` and call methods directly. RTA must be running before any of these are called (the editor starts RTA automatically).

| Method | Args | Purpose |
|--------|------|---------|
| `getAvailableFrontendActions` | none | List actions Joule can drive in the UI |
| `startRTA` | none | Start/ensure Runtime Authoring is active |
| `getOverlaysInformation` | none | Get all adaptable controls (overlays) |
| `getActions` | `controlId` | Get available actions for a specific control |
| `getContext` | `{ controlId }` | Get viewName, controlType, aggregation context for a control |
| `callAction` | `controlId, actionId, payload` | Execute an action |
| `startVisualization` | none | Start change visualization mode |
| `saveChanges` | none | Persist all flex changes |

### Calling pattern (always use this shape in `browser_evaluate`)

```javascript
async () => {
  const iframe = document.querySelector('iframe');
  const win = iframe.contentWindow;
  return new Promise((resolve, reject) => {
    win.sap.ui.require(['sap/ui/fl/ai/FlexJouleIntegrationApi'], async (Api) => {
      try {
        const result = await Api.<methodName>(<args>);
        resolve(result);
      } catch (err) {
        resolve({ __error: err.message });
      }
    }, (err) => resolve({ __error: 'failed to load FlexJouleIntegrationApi: ' + err.message }));
  });
}
```

If a call returns `{ __error: ... }`, report it and decide whether to retry.

## Workflow

### Step 1: Navigate to the Editor

Call `mcp__plugin_playwright_playwright__browser_navigate` with the editor URL.

Wait for the page to settle:
```
mcp__plugin_playwright_playwright__browser_wait_for — text: "Adaptation"
```

Take a `browser_snapshot` to confirm the iframe exists. The app renders inside an iframe — `document.querySelector('iframe')` from the outer page is sufficient (no specific selector needed; the calling pattern uses it directly).

### Step 2: Start RTA

Call `browser_evaluate` with the calling pattern using `Api.startRTA()`.

The editor may have already started RTA automatically. This call is idempotent — call it once to ensure RTA is active.

### Step 3: Get Overlays

Call `browser_evaluate` with `Api.getOverlaysInformation()`.

Returns an array of overlay descriptors for all adaptable controls (controlId, controlType, label/text, etc.). The exact shape is determined by the API — inspect the response to extract control identifiers.

### Step 4: Select Target Control

**AI Decision Point.** Match the user's instructions against the overlays.

Reasoning:
- Match user description against label and `controlType`
- "the title" → controls with `Title` or `Header` in type
- "the table" → `sap.ui.table.Table` or `sap.m.Table`
- "button X" → `sap.m.Button` with matching label
- "toolbar" → `sap.m.Toolbar` or `sap.m.OverflowToolbar`
- If ambiguous, ask the user which control they mean
- If no match, present available controls and ask

Store the selected `controlId`.

### Step 5: Get Actions

Call `browser_evaluate` with `Api.getActions('<controlId>')`.

Returns the list of available actions for that control. Each action describes what it does and what payload it expects.

### Step 6: Select Action

**AI Decision Point.** Match user intent to an available action.

Reasoning:
- "add a button/field/column" → `addFragment` (or similar)
- "hide" or "remove" → `remove` / `hide`
- "rename" or "change label/title" → `rename`
- "change property" → `changeProperty`
- "move" → `move`
- Prefer the most specific matching action
- If unclear, present options to the user

Store the selected `actionId` and its payload schema.

### Step 7: Get Element Context

Call `browser_evaluate` with `Api.getContext({ controlId: '<controlId>' })`.

Returns context needed for payload preparation (viewName, controlType, aggregation, existing properties). Use this to fill structural parameters in the next step.

### Step 8: Prepare Payload

**AI Decision Point.** Construct the action payload from:
1. The action's payload schema (Step 5)
2. The element context (Step 7)
3. The user's instructions

Reasoning:
- Fill structural parameters (viewName, aggregation) from context
- Fill value parameters (label text, property values) from user instructions
- If a required parameter cannot be determined, ask the user
- For `addFragment`: payload typically needs fragment name, target aggregation, index

### Step 9: Execute Action

Call `browser_evaluate` with `Api.callAction('<controlId>', '<actionId>', <payload>)`.

Check the result. On error, report to user and offer to retry with different parameters.

### Step 10: Loop for Multiple Changes

If the user requested multiple changes:
1. Go back to **Step 3** (re-fetch overlays — the UI may have changed)
2. Execute next change through Steps 4–9
3. Repeat until all changes are done

If a single request implies multiple operations (e.g., "add a button that calls a function" = fragment + controller extension), execute each as a separate iteration.

**Create all changes before proceeding to save or code generation.** If one change fails, retry it.

### Step 11: Save Changes

Call `browser_evaluate` with `Api.saveChanges()`.

This persists all flex changes to the adaptation project's `webapp/changes/` directory.

### Step 12: Generate Fragment and Controller Extension Content

After saving, use fiori-mcp to fill in the content for created fragments and controller extensions.

**Phase 1 — Get knowledge base:**
Call `mcp__fiori-mcp__adp_controller_extension` with:
- `appPath`: adaptation project path
- `prompt`: describe what functionality is needed
- Do NOT pass `aiResponse`

Returns: project context, layer info, namespace rules, existing files.

**Phase 2 — Generate and write content:**
Using the knowledge base, generate the controller extension and XML fragment code following the rules (namespace conventions, layer-awareness, stable IDs).

Call `mcp__fiori-mcp__adp_controller_extension` again with:
- `appPath`: same path
- `prompt`: same prompt
- `aiResponse`: your generated code with `**Path:**` markers
- `controllerName`: the controller extension name

Format for `aiResponse`:
```
**Path:** webapp/changes/coding/MyExtension.js
\`\`\`javascript
// controller extension code
\`\`\`

**Path:** webapp/changes/fragments/MyFragment.fragment.xml
\`\`\`xml
<!-- fragment code -->
\`\`\`
```

Include XML comments in fragments for context hints:
```xml
<!-- viewName: <from context> -->
<!-- controlType: <from context> -->
<!-- targetAggregation: <from context> -->
```

### Step 13: Cleanup

Kill the editor server:
```bash
kill <processId>
# or by port:
lsof -ti:<port> | xargs kill
```

Report to user: summary of all changes made, files created, any issues encountered.

## Error Handling

| Situation | Action |
|-----------|--------|
| Page not loading | Wait 30s. If still nothing, verify URL and server is running. |
| `FlexJouleIntegrationApi` fails to load | Verify it's served from `<host>/resources/sap/ui/fl/ai/FlexJouleIntegrationApi.js`. Without it, the workflow can't proceed. |
| `startRTA` fails | Retry once after 3s. If still fails, app may not support RTA. |
| `getOverlaysInformation` returns empty | Wait 5s, retry. If still empty, screenshot and ask user. |
| Action execution returns `__error` | Report error, offer retry with different params. |
| `saveChanges` fails | Report error. Inform user changes may be lost. |

## Multi-Change Strategy

When the user requests multiple changes:
1. Parse all intended changes upfront
2. Execute sequentially (Steps 3–9 per change)
3. Save once at the end (Step 11)
4. If one fails, save successful changes and report which failed
5. Generate content for all fragments/extensions together in Step 12

## Example Session

**User:** "Add a custom button to the object page toolbar that shows a dialog with order details"

**Execution:**
1. Navigate to editor URL, ensure RTA started (`Api.startRTA()`)
2. `Api.getOverlaysInformation()` → find toolbar control on object page
3. `Api.getActions('<toolbarControlId>')` → select `addFragment`
4. `Api.getContext({ controlId: '<toolbarControlId>' })` → get viewName, aggregation
5. Prepare payload: fragment name, target aggregation, index
6. `Api.callAction(...)` → creates empty fragment + change file
7. `Api.saveChanges()`
8. `adp_controller_extension` Phase 1 → knowledge base
9. Generate: controller extension with dialog logic + fragment XML with button
10. `adp_controller_extension` Phase 2 → write files
11. Kill editor, report done
