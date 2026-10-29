# Example Session

> Referenced from [SKILL.md](../SKILL.md). Worked walkthrough of the full skill flow for a button + dialog on an Object Page.

**User request:** "Add a custom button to the object page toolbar that shows a dialog with order details."

This intent maps to **two actions** (see *Disambiguation by intent* in [rta-actions.md](rta-actions.md)): `CTX_ADDXML` for the button, then `CTX_EXTEND_CONTROLLER` for the press handler. The app starts on a List Report, so the Object Page toolbar isn't on screen yet — the page-action loop drives the navigation first.

1. `start` with `{ site, frameId: "preview" }` → `{ site, frameId, rtaStarted: true }`
2. `describe_ui` → inspect current UI tree; find the "Go" / search button id.
3. `execute_page_action({ actionName: "press", elementId: "<goButtonId>" })` → Filter Bar search ran and rows arrived.
4. `describe_ui` → find a row navigation cell id (look for `ColumnListItem` with `-imgNav` suffix).
5. `execute_page_action({ actionName: "press", elementId: "<rowNavCellId>" })` → Object Page is mounted.
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
12. `restart` → `{ site, frameId, rtaStarted: true }`. Navigate to the Object Page toolbar again via `describe_ui` + `execute_page_action` (re-run the Go → row-press sequence), then `get_overlays` — confirm the inserted fragment overlay (`OrderDetailsButton`) appears.
13. `stop`, then kill the editor server. Report done — including the confidence the model assigned to each AI decision.
