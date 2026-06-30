---
'@sap-ux/fiori-mcp-server': minor
---

feat(fiori-mcp-server): align `run_rta_workflow_step` with the updated `FlexJouleIntegrationApi` frontend-action shapes.

- `get_overlays` now returns `{ overlays, actionsCatalog }`. Each `Overlay` carries `parentElementId`, `parentAggregationName`, optional `index`, and `actionIds`; rich per-action metadata (label, description, parameters) is deduplicated into `actionsCatalog`, keyed by action id.
- The `get_actions` step has been removed: the editor page no longer exposes a standalone `getActions` frontend action. Per-overlay action ids and the catalog now come from `get_overlays`, and per-action parameter declarations come from `get_context.actionParameters`.
- `Action` payloads use `parameters` (was `payload`) and may carry a `description`. The `ActionPayloadProperty` type has been renamed to `ActionParameter`.
- `ElementContext` returned by `get_context` now exposes `elementType`, `actionParameters`, `defaultChildAggregation`, `aggregationsByClass`, `availableModels`, and `actionSpecificContext`. The legacy `defaultChildAggregationName` / `controlType` / `content` / index-signature fields are gone.
