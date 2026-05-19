---
name: adp-rta-workflow
description: Use when making RTA changes to a SAP Fiori adaptation project via the adaptation editor — adding/removing UI elements, changing properties, renaming labels, hiding controls, or extending controllers and fragments.
---

# ADP RTA Workflow

Drive Runtime Authoring (RTA) in the SAP Fiori adaptation editor by invoking small Node scripts in this skill's `scripts/` directory. Each script wraps one Joule frontend action via the package's `frontend-actions` module. The first script (`startRTA.js`) launches a detached Chrome process and persists its CDP endpoint to disk; subsequent scripts attach to that same browser via Playwright's `connectOverCDP` so RTA state survives across calls. `stopRTA.js` shuts everything down at the end.

## Prerequisites

- fiori-mcp-server installed and built — `dist/frontend-actions.js` must exist
- A system Chrome (or any Chromium-family browser) installed. Selection priority:
  1. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` (absolute path)
  2. `PLAYWRIGHT_BROWSER_CHANNEL` (`chrome`, `chrome-beta`, `msedge`, ...)
  3. Default: stock Google Chrome
- Adaptation editor URL (from the `adp-project-setup` skill or user-provided)

## Frontend-Action Map

Each step shells out to one Node script. All scripts print a single line of JSON to stdout on success and `{ "error": "..." }` to stderr on failure. Exit codes: `0` success, `1` runtime failure, `2` usage error.

| Script | Action | Required args | Returns |
|--------|--------|---------------|---------|
| `startRTA.js` | start RTA | `--site`, opt `--frameId` | `{ rtaStarted: boolean }` |
| `getOverlays.js` | list editable overlays | `--site`, opt `--frameId` | `Overlay[]` |
| `getActions.js` | list actions for a control | `--site`, `--controlId`, opt `--frameId` | `Action[]` |
| `getContext.js` | fetch context for control + action | `--site`, `--controlId`, `--actionId`, opt `--frameId` | context object |
| `callAction.js` | execute an action | `--site`, `--controlId`, `--actionId`, `--payload` (JSON), opt `--frameId` | `boolean` |
| `save.js` | persist all changes | `--site`, opt `--frameId` | `boolean` |
| `stopRTA.js` | tear down the persistent browser | (none) | `{ stopped: true }` |

In all scripts that take `--frameId`, pass `preview` for the standard adaptation-editor preview iframe.

## Workflow

### Step 1: Start RTA

```
node "$(dirname "$0")/scripts/startRTA.js" --site=<editor URL> --frameId=preview
```

Verify `rtaStarted: true`. On `false` or non-zero exit, wait 3 s and retry once. The script returns when RTA is fully started; the browser stays alive for the rest of the workflow.

### Step 2: Get Overlays

```
node "$(dirname "$0")/scripts/getOverlays.js" --site=<editor URL> --frameId=preview
```

Returns an array of `{ overlayId, controlId, label, controlType }`. These are every UI5 control RTA considers editable on the current page.

### Step 3: Select Target Control

**AI Decision Point.** Match the user's instruction against the overlays list.

- "the title" → controls with `Title` or `Header` in `controlType`
- "the table" → `sap.ui.table.Table` or `sap.m.Table`
- "button X" → `sap.m.Button` with matching label
- "toolbar" → `sap.m.Toolbar` or `sap.m.OverflowToolbar`
- If multiple match, ask the user which to pick
- If none match, present the list and ask

Store the chosen `controlId`.

### Step 4: Get Actions

```
node "$(dirname "$0")/scripts/getActions.js" --site=<editor URL> --controlId=<id> --frameId=preview
```

Returns the actions available for that control: `[{ id, label, payload: [{ name, type, required, description }] }]`.

### Step 5: Select Action

**AI Decision Point.** Match user intent to one of the returned actions.

- "add a button/field/column" → `addFragment`
- "hide" / "remove" → `remove` (or `hide` if both are offered)
- "rename" / "change label" → `rename`
- "change property" → `changeProperty`
- "move" → `move`

Store `actionId` and the action's `payload` schema.

### Step 6: Get Element Context

```
node "$(dirname "$0")/scripts/getContext.js" --site=<editor URL> --controlId=<id> --actionId=<id> --frameId=preview
```

Returns a context object with `viewName`, `controlType`, aggregation info, etc. Used to fill structural payload fields in the next step.

### Step 7: Prepare Payload

**AI Decision Point.** Build the action payload from the action's `payload` schema (Step 5), the element context (Step 6), and the user's instructions.

- Fill structural fields (`viewName`, target aggregation, ...) from context.
- Fill value fields (label text, property values, ...) from instructions.
- For `addFragment`: typically `{ fragmentName, targetAggregation, index }`.
- If a required field can't be derived, ask the user.
- Validate types match the schema.

### Step 8: Execute Action

```
node "$(dirname "$0")/scripts/callAction.js" --site=<editor URL> --controlId=<id> --actionId=<id> \
  --payload='<json>' --frameId=preview
```

`--payload` must be a JSON object string. Returns `true` on success. On failure, report the error and offer to retry with adjusted parameters.

### Step 9: Loop for Multiple Changes

If the user asked for multiple changes, repeat Steps 2–8 once per change (the UI may have changed, so call `getOverlays.js` fresh between changes). If a single request implies multiple operations (e.g. "add a button that calls a function" = fragment + controller extension), execute each as a separate iteration.

Create all changes before saving.

### Step 10: Save Changes

```
node "$(dirname "$0")/scripts/save.js" --site=<editor URL> --frameId=preview
```

Returns `true` on success.

### Step 11: Generate Fragment and Controller Extension Content

After saving, use fiori-mcp to fill in the content for any fragments and controller extensions that were created.

**Phase 1 — knowledge base.** Call `mcp__fiori-mcp__adp_controller_extension` with:
- `appPath`: adaptation project path
- `prompt`: describe the functionality (from user instructions)
- (do **not** pass `aiResponse`)

This returns project context, layer info, namespace rules, and existing files.

**Phase 2 — write content.** Generate controller extension and fragment XML using the Phase 1 knowledge base, then call `mcp__fiori-mcp__adp_controller_extension` again with:
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

### Step 12: Cleanup

```
node "$(dirname "$0")/scripts/stopRTA.js"
```

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
| Page not loading | Wait 30 s. If still nothing, verify URL and that the editor server is running. |
| `startRTA` fails | Retry once after 3 s. If still fails, the app may not support RTA. |
| `getOverlays` empty | Wait 5 s, retry. If still empty, ask the user to confirm the editor is on the right view. |
| Action execution fails | Report error, offer retry with different params. |
| Save fails | Report error. Inform user changes may be lost. |
| Frontend action "not registered" | Wrong frame, or the editor hasn't finished loading. Verify `--frameId=preview` and retry. |
| `Failed to load frontend-actions bundle` | `dist/frontend-actions.js` is missing — run `pnpm --filter @sap-ux/fiori-mcp-server build`. |

## Multi-Change Strategy

When the user requests multiple changes:
1. Parse all intended changes upfront.
2. Execute Steps 2–8 once per change.
3. Save once at the end (Step 10).
4. If one change fails, save the successful ones and report which failed.
5. Generate content for all fragments / extensions together in Step 11.
6. Stop the browser (Step 12) only after everything is done.

## Example Session

User: "Add a custom button to the object page toolbar that shows a dialog with order details."

1. `startRTA.js` → `{ rtaStarted: true }`
2. `getOverlays.js` → find toolbar control on object page
3. `getActions.js --controlId=<toolbar>` → `addFragment`
4. `getContext.js` for `(toolbar, addFragment)` → viewName etc.
5. `callAction.js` with payload `{ fragmentName, targetAggregation, index }` → `true`
6. `save.js` → `true`
7. `adp_controller_extension` Phase 1 → knowledge base
8. Generate controller extension + fragment, Phase 2 writes files
9. `stopRTA.js`, then kill the editor server. Report done.
