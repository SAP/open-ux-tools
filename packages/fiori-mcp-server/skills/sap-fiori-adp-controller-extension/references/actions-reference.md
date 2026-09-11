# Actions Reference

> Referenced from [SKILL.md](../SKILL.md). Use the `id` values from this table — **never invent or guess an action id.** If `actionsCatalog` exposes ids not listed here, surface them to the user rather than picking.

## `CTX_ADDXML` — Add: Fragment

Insert an XML fragment as a child of the selected control. This is the action for "add a button / field / column / section" via a fragment file.

| Field | Type | Required | Description |
|---|---|---|---|
| `fragmentPath` | string | yes | Path to the fragment XML, formatted `fragments/<Name>.fragment.xml`. |
| `targetAggregation` | string | yes | Aggregation of the parent control where the fragment is inserted (e.g. `content`, `items`, `headerContent`). Read from `get_context`. |
| `index` | int | yes | Position within the aggregation. Use `0` for first, the current child count for "append at end". |

## `CTX_EXTEND_CONTROLLER` — Extend Controller

Attach a controller extension JS file to a view. Use this when fragment event handlers reference methods that need a JS implementation, or whenever the user asks for behavior changes (handlers, lifecycle hooks, formatters).

| Field | Type | Required | Description |
|---|---|---|---|
| `codeRef` | string | yes | Path to the controller extension, formatted `coding/<Name>.js`. |
| `viewId` | string | yes | Any control id inside the view, or the view id itself. The `controlId` of the current selection works. |
| `instanceSpecific` | boolean | no | `true` extends only this view instance; `false`/omitted extends every view that uses this controller. |

## Disambiguation by intent

| User intent | Action |
|---|---|
| "add a button / field / column / section / dialog opener" | `CTX_ADDXML` (fragment carries the new control) |
| "make this button do X" / "open a dialog when …" / "change behavior" | `CTX_EXTEND_CONTROLLER` (handler lives in the controller extension) |
| "add a button that opens a dialog" | **Both**, in this order: `CTX_ADDXML` for the button, then `CTX_EXTEND_CONTROLLER` for the press handler. Run as two separate iterations of Steps 4–9. |
