# ABAP RAP Treeviews - Introduction

## 1. Overview

In RAP, CDS hierarchies model parent-child data and expose it to the SAP Fiori UI as a **treeview** — a collapsible SAP Fiori Elements treetable where each row is a hierarchy node and the top row is the root.

Typical use cases: company/department structures, material classifications, product component structures. A common pattern is a self-referencing hierarchy (e.g. an employee whose manager ID points to another employee).

Treeviews build on the SAP HANA database (hierarchy functions), ABAP CDS (querying hierarchical data), and CDS hierarchies (`DEFINE HIERARCHY`). With RAP they enable **transactional, draft-enabled** Fiori apps, not just analytical scenarios.

---

## 2. Treeview Features

RAP supports **read-only** and **editable** treeviews. Editable treeview features:

| Feature | Managed | Unmanaged |
|---------|---------|-----------|
| **Reassign node** (drag & drop / cut & paste) | Declare link/unlink actions | Declare + implement link/unlink actions |
| **Reorder among siblings** | Managed reorder action (single integer/numc field) or custom | Declare + implement custom action |
| **Copy node** | Declare + implement custom action | Declare + implement custom action |
| **Delete with children** | `with cascading delete` | Implement custom cascading delete |
| **Inline editing** | Provided by framework | Provided by framework |

**Notes:**
- **Reorder:** New child nodes have no sibling order number until reorder runs, so duplicates can exist temporarily. Add a determination to keep sibling numbers unique and non-empty.
- **Cascading delete:** Optional but recommended — the UI expects server-side cascading for subtrees and behaves inconsistently without it.

---

## 3. Hierarchy Directories

A **hierarchy directory** is a CDS view entity listing multiple subhierarchies, with a field distinguishing them (e.g. agency ID separating each agency's employee hierarchy).

- **Required for editable treeviews** — without a directory you only get a read-only treeview (nodes editable on their object pages, but no drag & drop or structural changes).
- The directory filter must filter precisely on the composition-to-parent association of the hierarchy node, so each treeview shows nodes from only one directory instance.

---

## 4. Architecture Overview

### Read-Only Treeview
1. **Database table** — hierarchy data
2. **Interface view** — refers to the table, adds hierarchy node as self-projection
3. **CDS hierarchy** (`DEFINE HIERARCHY`) — adds hierarchical interpretation
4. **Projection view** — combines interface view with the hierarchy
5. **Service definition & binding** — exposes to the UI

### Editable Treeview with Draft
1. **Active + draft tables** — for hierarchical data and directory
2. **Interface views** — first projection layer; directory and data related by one-to-many; data view has self-association to parent
3. **CDS hierarchy** — adds hierarchical interpretation
4. **Base CDS views** — add compositional info (directory = composition parent/root, data = composition child)
5. **Behavior definition** — draft capability + editing actions (link, unlink, reorder, copy)
6. **Projection views** — directory as transactional query; data projection uses `@OData.hierarchy.recursiveHierarchy`
7. **Projection behavior definition**
8. **Behavior implementation** — authorizations, numbering, determinations, validations
9. **Service definition & binding**

### Key Differences

| Aspect | Read-Only | Editable with Draft |
|--------|-----------|---------------------|
| Database tables | 1 active | Active + draft (data and directory) |
| Directory | Optional | **Required** |
| Composition | Not required | Required |
| Behavior definition | Not required | Required (draft + actions) |
| Associations | Self-projection | Self-association + parent association |

---

## Sources
- https://help.sap.com/docs/abap-cloud/abap-rap/treeviews
- https://help.sap.com/docs/abap-cloud/abap-rap/treeview-features
- https://help.sap.com/docs/abap-cloud/abap-rap/hierarchy-directories
- https://help.sap.com/docs/abap-cloud/abap-rap/treeviews-architecture-overview
