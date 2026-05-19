---
name: adp-rta-workflow
description: Use when making RTA changes to a SAP Fiori adaptation project via the adaptation editor — adding/removing UI elements, changing properties, renaming labels, hiding controls, or extending controllers and fragments
---

# ADP RTA Workflow

Execute Runtime Authoring (RTA) changes in the SAP Fiori adaptation editor using Playwright browser automation and the FlexJouleIntegrationApi exposed via `window.__rtaUtil`.

## Prerequisites

- Playwright MCP connected (`mcp__plugin_playwright_playwright__*` tools)
- fiori-mcp server connected (`mcp__fiori-mcp__adp_controller_extension`)
- Adaptation editor running (URL from `adp-project-setup` skill or user-provided)
- User has described what UI changes they want

## RTA Util API Contract

All RTA operations use a single async dispatch function on the editor page:

```javascript
await window.__rtaUtil.execute(methodName, args)
```

| Method | Args | Returns |
|--------|------|---------|
| `startRTA` | none | `{ rtaStarted: boolean }` |
| `getOverlays` | none | `[{ controlId, overlayId, label, controlType }]` |
| `getActions` | `{ controlId }` | `[{ id, label, payload: [{ name, type, required, description }] }]` |
| `getContext` | `{ controlId }` | Context object (viewName, controlType, aggregation info) |
| `callAction` | `{ controlId, actionId, payload }` | Action result |
| `save` | none | `{ saved: boolean }` |

## Workflow

### Step 1: Navigate to the Editor

Call `mcp__plugin_playwright_playwright__browser_navigate` with the editor URL.

Wait for the app to load:
```
mcp__plugin_playwright_playwright__browser_wait_for — text: "Adaptation" (or similar loading indicator)
```

Take a `browser_snapshot` to identify the page structure. The app typically renders inside an iframe (e.g., `iframe#preview`). All subsequent `browser_evaluate` calls must target that iframe using the `target` parameter.

### Step 2: Start RTA

Call `mcp__plugin_playwright_playwright__browser_evaluate` with:
- `function`: `async () => { return await window.__rtaUtil.execute('startRTA'); }`
- `target`: the iframe selector identified in Step 1

Verify response contains `{ rtaStarted: true }`. If false, wait 3 seconds and retry once.

### Step 3: Get Overlays

Call `browser_evaluate` with:
- `function`: `async () => { return await window.__rtaUtil.execute('getOverlays'); }`
- `target`: iframe selector

Returns array of all adaptable controls:
- `controlId` — stable UI5 control ID
- `overlayId` — overlay element ID
- `label` — human-readable label
- `controlType` — e.g., `sap.m.Button`, `sap.ui.table.Table`

### Step 4: Select Target Control

**AI Decision Point.** Match the user's instructions against the overlays list.

Reasoning:
- Match user description against `label` and `controlType`
- "the title" → controls with `Title` or `Header` in type
- "the table" → `sap.ui.table.Table` or `sap.m.Table`
- "button X" → `sap.m.Button` with matching label
- "toolbar" → `sap.m.Toolbar` or `sap.m.OverflowToolbar`
- If ambiguous (multiple matches), ask the user which control they mean
- If no match, present available controls and ask

Store selected `controlId`.

### Step 5: Get Actions

Call `browser_evaluate` with:
- `function`: `async () => { return await window.__rtaUtil.execute('getActions', { controlId: '<controlId>' }); }`
- `target`: iframe selector

Returns actions, each with:
- `id` — action identifier (e.g., `addFragment`, `rename`, `remove`, `changeProperty`)
- `label` — human-readable name
- `payload` — parameter descriptors array

### Step 6: Select Action

**AI Decision Point.** Match user intent to an available action.

Reasoning:
- "add a button/field/column" → `addFragment`
- "hide" or "remove" → `remove` or `hide`
- "rename" or "change label/title" → `rename`
- "change property" → `changeProperty`
- "move" → `move`
- Prefer the most specific matching action
- If unclear, present options to the user

Store selected `actionId` and its `payload` schema.

### Step 7: Get Element Context

Call `browser_evaluate` with:
- `function`: `async () => { return await window.__rtaUtil.execute('getContext', { controlId: '<controlId>' }); }`
- `target`: iframe selector

Returns context needed for payload preparation (viewName, controlType, aggregation info, existing properties).

### Step 8: Prepare Payload

**AI Decision Point.** Construct the action payload from:
1. The action's `payload` parameter descriptors (name, type, required, description)
2. The element context from Step 7
3. The user's instructions

Reasoning:
- Fill structural parameters (viewName, aggregation) from context
- Fill value parameters (label text, property values) from user instructions
- If a required parameter cannot be determined, ask the user
- Validate types match the descriptors
- For `addFragment`: payload typically needs fragment name, target aggregation, index

### Step 9: Execute Action

Call `browser_evaluate` with:
- `function`: `async () => { return await window.__rtaUtil.execute('callAction', { controlId: '<controlId>', actionId: '<actionId>', payload: <payload> }); }`
- `target`: iframe selector

Check result for success. On error, report to user and offer to retry with different parameters.

### Step 10: Loop for Multiple Changes

If the user requested multiple changes:
1. Go back to **Step 3** (get fresh overlays — UI may have changed)
2. Execute next change through Steps 4-9
3. Repeat until all changes are done

If a single request implies multiple operations (e.g., "add a button that calls a function" = fragment + controller extension), execute each as a separate change iteration.

**Create all changes before proceeding to save or code generation.** If one change fails, retry it. All changes must be created before Step 11.

### Step 11: Save Changes

Once all changes are complete:

Call `browser_evaluate` with:
- `function`: `async () => { return await window.__rtaUtil.execute('save'); }`
- `target`: iframe selector

Verify `{ saved: true }`.

### Step 12: Generate Fragment and Controller Extension Content

After saving, use fiori-mcp to fill in the content for created fragments and controller extensions.

**Phase 1 — Get knowledge base:**
Call `mcp__fiori-mcp__adp_controller_extension` with:
- `appPath`: adaptation project path
- `prompt`: describe what functionality is needed (from user instructions)
- Do NOT pass `aiResponse`

This returns: project context, layer info, namespace rules, existing files.

**Phase 2 — Generate and write content:**
Using the knowledge base from Phase 1, generate the controller extension and XML fragment code following the rules (namespace conventions, layer-awareness, stable IDs).

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
```
Or by port:
```bash
lsof -ti:<port> | xargs kill
```

Report to user: summary of all changes made, files created, any issues encountered.

## Error Handling

| Situation | Action |
|-----------|--------|
| Page not loading | Wait 30s. If still nothing, verify URL and server is running. |
| startRTA fails | Retry once after 3s. If still fails, app may not support RTA. |
| getOverlays empty | Wait 5s, retry. If still empty, screenshot and ask user. |
| Action execution fails | Report error, offer retry with different params. |
| Save fails | Report error. Inform user changes may be lost. |
| `__rtaUtil` undefined | Target wrong frame. Use `browser_snapshot` to find correct iframe. |

## Multi-Change Strategy

When the user requests multiple changes:
1. Parse all intended changes upfront
2. Execute sequentially (Steps 3-9 per change)
3. Save once at the end (Step 11)
4. If one fails, save successful changes and report which failed
5. Generate content for all fragments/extensions together in Step 12

## Example Session

**User:** "Add a custom button to the object page toolbar that shows a dialog with order details"

**Execution:**
1. Navigate to editor URL, start RTA
2. Get overlays → find toolbar control on object page
3. Actions for toolbar → select `addFragment` 
4. Prepare payload: fragment name, target aggregation, index
5. Execute → creates empty fragment + change file
6. Save all changes
7. Call `adp_controller_extension` Phase 1 → get knowledge base
8. Generate: controller extension with dialog logic + fragment XML with button
9. Call `adp_controller_extension` Phase 2 → write files
10. Kill editor, report done
