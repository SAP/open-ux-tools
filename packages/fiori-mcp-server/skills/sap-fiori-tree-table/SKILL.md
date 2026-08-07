---
name: sap-fiori-tree-table
description: Configure hierarchical tree table to SAP Fiori elements application for displaying parent-child recursive hierarchies. Supports CAP and ABAP RAP (OData V4).
argument-hint: Entity name (and ABAP package for RAP projects)
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori Tree Table with Recursive Hierarchy

## Purpose
Configure **hierarchical tree table** to display parent-child relationships in a recursive structure (organizational hierarchies, category trees, nested data).

---

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

### For ABAP RAP Projects:
1. **Package name** - Where to create hierarchy objects ($TMP for local, or specific package like Z_MAINT)
2. **Entity name** - The entity to make hierarchical (e.g., "Equipment", "Category", "FunctionalLocation")

### For CAP Projects:
1. **Entity name** - The entity to make hierarchical (e.g., "Travel", "Category", "ProductCategory")

**DO NOT proceed with implementation until all inputs are confirmed.**

---

## CAP Implementation (6 Steps)

### Prerequisites
- ✅ Existing CAP project with CDS entity
- ✅ SAP Fiori Elements List Report application
- ✅ CAP service must be exposed as OData V4 (recursive hierarchy is V4-only)
- ✅ Entity uses `cuid` or has UUID primary key
- ✅ CDS MCP server tools available

### 1. Check Current Entity Structure
Use CDS MCP to search the model for the target entity structure before making changes

### 2. Add Hierarchy Association
Add self-referencing managed association to `db/schema.cds`:

```cds
entity <EntityName> : cuid, managed {
  // ... existing fields ...
  parent : Association to <EntityName>;  // ← Add this managed association
  // ... rest of entity ...
}
```

✅ **Must be managed** (no `on` condition)  
✅ **Name it `parent`** (creates `parent_ID` foreign key)

### 3. Add @hierarchy Annotation
Add to service entity in `srv/<service>.cds`:

```cds
service <ServiceName> @(path: '/<path>') {
  @hierarchy  // ← Add this annotation
  entity <EntityName> as projection on db.<EntityName> {
    *,
    // ... redirected associations ...
  };
}
```

✅ **On service entity** (not database entity)  
✅ **Before entity definition**

### 4. Configure TreeTable in Manifest
Update List Report target in `app/<app>/webapp/manifest.json`:

**Path:** `sap.ui5.routing.targets.<ListReportTargetName>.options.settings.controlConfiguration`

```json
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "tableSettings": {
      "type": "TreeTable",
      "hierarchyQualifier": "<EntityName>Hierarchy"
    }
  }
}
```

✅ **type: "TreeTable"** (not "ResponsiveTable")  
✅ **hierarchyQualifier** matches the auto-registered qualifier from `@hierarchy` annotation (CAP auto-registers `<EntityName>Hierarchy` when `@hierarchy` is applied)

### 5. Create Sample Hierarchical Data
Create CSV at `db/data/<namespace>-<EntityName>.csv`:

```csv
ID;Name;Description;parent_ID
11111111-1111-1111-1111-111111111111;Electronics;;
22222222-2222-2222-2222-222222222222;Computers;;11111111-1111-1111-1111-111111111111
33333333-3333-3333-3333-333333333333;Laptops;;22222222-2222-2222-2222-222222222222
44444444-4444-4444-4444-444444444444;Desktops;;22222222-2222-2222-2222-222222222222
55555555-5555-5555-5555-555555555555;Home & Garden;;
66666666-6666-6666-6666-666666666666;Furniture;;55555555-5555-5555-5555-555555555555
```

✅ **Use `parent_ID`** (with underscore!)  
✅ **Root items have empty parent_ID**  
✅ **Valid UUID format** (use real UUIDs for production data)

### 6. Test
```bash
npm run watch-<app-name>
```

---

## ABAP RAP Implementation (4 Steps)

### 1. Check for Existing Hierarchy
Examine `webapp/localService/mainService/metadata.xml` for:
- `SAP__hierarchy.RecursiveHierarchySupported`
- `SAP__hierarchy.RecursiveHierarchy`
- `SAP__aggregation.RecursiveHierarchy`

**If found:**
- Extract Qualifier value (e.g., "ZZZR_TRAVEL000_HIERARCHY")
- Skip to Step 3

**If not found:**
- Backend needs hierarchy implementation
- Proceed to Step 2

### 2. Implement Backend Hierarchy
**� Best Practice: Fetch SAP Documentation First**

**If `fetch_webpage` (or an equivalent web fetch tool) is available, retrieve the following SAP Help Portal pages for the latest patterns:**

   - **[Developing Apps with Hierarchical Data Structures](https://help.sap.com/docs/abap-cloud/abap-rap/implementing-hierarchical-view)** - Overview
   - **[Treeviews with Read-Only Capabilities](https://help.sap.com/docs/abap-cloud/abap-rap/treeview-with-read-only-capability)** - Architecture
   - **[Creating the Database Table](https://help.sap.com/docs/abap-cloud/abap-rap/creating-database-table)** - Parent-child table structure
   - **[Creating the Interface View](https://help.sap.com/docs/abap-cloud/abap-rap/creating-interface-view)** - Self-association logic
   - **[Creating the Hierarchy Node](https://help.sap.com/docs/abap-cloud/abap-rap/creating-hierarchy-node)** - Hierarchy definition
   - **[Creating the Projection View](https://help.sap.com/docs/abap-cloud/abap-rap/creating-consumption-view)** - Projection with redirected association
   - **[Displaying Treeview on SAP Fiori UI](https://help.sap.com/docs/abap-cloud/abap-rap/hierarchical-treeview-on-ui)** - UI configuration

**Example fetch_webpage usage:**
```
fetch_webpage(
  query: "ABAP RAP hierarchy, interface view self-referencing association, define hierarchy syntax, projection view redirect",
  urls: [all 7 URLs above]
)
```

**If `fetch_webpage` is not available,** apply the canonical patterns documented below (which match the official SAP documentation as of this skill's creation).

**Implementation patterns (authoritative fallback):**

**CRITICAL Requirements (from SAP documentation):**
- ✅ Database table with parent field (e.g., `parent_uuid`, `manager`)
- ✅ Interface view must have self-referencing association
  ```abap
  association [0..1] to INTERFACE_VIEW as _Parent on $projection.<ParentField> = _Parent.<KeyField>
  ```
- ✅ Hierarchy uses `define hierarchy` syntax (not `define view entity`)
  ```abap
  define hierarchy HIERARCHY_NAME as parent child hierarchy(
    source INTERFACE_VIEW
    child to parent association _Parent
    start where <ParentField> is initial
    siblings order by <SortField>
  )
  ```
- ✅ Projection view must have `@OData.hierarchy.recursiveHierarchy` annotation
  ```abap
  @OData.hierarchy.recursiveHierarchy:[{ entity.name: 'HIERARCHY_NAME' }]
  ```
- ✅ Projection view must redirect parent association to itself
  ```abap
  _Parent : redirected to PROJECTION_VIEW
  ```

**Additional Notes:**
- ❌ No "Create Hierarchy" tool in ADT/MCP - must create Data Definition manually
- ✅ Create Data Definition first → replace with `define hierarchy` syntax
- ❌ Never create ABAP programs for populating test data (optional helper class OK)
- ✅ All objects must be activated in correct order: Table → Interface → Hierarchy → Projection → Service → Binding

**After implementation:**
- Activate all objects in correct order
- Verify `@OData.hierarchy.recursiveHierarchy` annotation is in projection view
- Return to Step 1 to extract Qualifier from metadata

### 3. Configure TreeTable in Manifest
Update List Report target in `webapp/manifest.json`:

```json
"controlConfiguration": {
  "@com.sap.vocabularies.UI.v1.LineItem": {
    "tableSettings": {
      "type": "TreeTable",
      "hierarchyQualifier": "ZZZR_TRAVEL000_HIERARCHY"
    }
  }
}
```

✅ **Use EXACT Qualifier** from metadata (case-sensitive)  
✅ **type: "TreeTable"**

### 4. Test
```bash
npm run start-mock  # Needs metadata refresh
npm start           # No refresh - fetches metadata from live backend
```
Consult Fiori MCP server if available on how to refresh metadata for SAP/cloud systems.

---

## Common Errors and Solutions

### CAP Errors

**"@hierarchy not supported for unmanaged association"**
```cds
// ❌ Wrong
parent : Association to Travel on parent.ID = parentID;

// ✅ Correct
parent : Association to Travel;
```

**"table has no column named parentID"**
- Use `parent_ID` (underscore!) in CSV header

**"No artifact 'cuid'"**
```cds
using { cuid, managed } from '@sap/cds/common';
```

**"@hierarchy ignored"**
- Association must be managed (no `on` condition)
- Must reference same entity type

**"CDS compilation failed"**
- `@hierarchy` on service entity (not db entity)
- Entity must have UUID key
- Parent association must be self-referencing

**"hierarchyQualifier not found"**
- Verify `@hierarchy` in `srv/<service>.cds`
- Check metadata: `http://localhost:4004/service/$metadata`
- Restart CAP service

**"Failed to parse metadata"**
- Check CDS compilation errors
- Run: `cds compile srv --to edmx`
- Restart service

**"TreeTable not rendering"**
- `type: "TreeTable"` (not "ResponsiveTable")
- `hierarchyQualifier` matches service
- CSV has `parent_ID` column (underscore!)
- Root items have empty `parent_ID`

**"Data not loading"**
- CSV in `db/data/` with correct name
- Semicolon (`;`) delimiter
- Valid UUIDs
- Run `cds watch` to load data

---

### RAP Errors

**"Entity references hierarchy which contains errors"**
- Use `define hierarchy` (not `define view entity`)
- Created as Data Definition (DDLS/DF)
- Activate in correct order

**"Primary keys don't match"**
```abap
// ❌ Wrong
define hierarchy HIERARCHY_NAME as parent child hierarchy(...) {
  UUID,  // Missing key!
}

// ✅ Correct
define hierarchy HIERARCHY_NAME as parent child hierarchy(...) {
  key UUID,
}
```

**"No parent association found"**
```abap
// ❌ Wrong
define root view entity C_Entity as projection on R_Entity {
  _ParentCategory  // Not redirected!
}

// ✅ Correct
define root view entity C_Entity as projection on R_Entity {
  _ParentCategory : redirected to C_Entity
}
```

**"child to parent association not found"**
- Add self-association in interface view (R_*)

**"Hierarchy cannot be activated"**
- Activate order: Table → Interface → Hierarchy → Projection → Service → Binding
- Use mass activation
- Check syntax errors first

**"Association target does not exist"**
- Create and activate projection view first

**"hierarchyQualifier not found"**
- Extract EXACT Qualifier from `metadata.xml`
- Search for `SAP__hierarchy.RecursiveHierarchy`
- Case-sensitive match required

**"Failed to parse metadata"**
- Check activation errors in all objects
- Verify service binding is published (not just activated)
- Ensure OData V4 (not V2)
- Check transport issues

**"TreeTable not rendering"**
- `hierarchyQualifier` matches metadata exactly
- Projection view redirects parent association
- Hierarchy annotation in service metadata
- Clear browser cache

**"Data not loading"**
- Database table has parent-child data
- Parent ID references existing records
- Root items have NULL parent ID
- Interface view association correct
- Hierarchy `start where` clause correct

---

## Key Differences

**CAP:**
- Managed association in entity
- `@hierarchy` annotation on service
- CSV data with `parent_ID` column
- Test with `npm run watch`

**RAP:**
- Database table → Interface → Hierarchy → Projection → Service
- Metadata extension for UI annotations
- Qualifier from OData metadata
- Preview from service binding

---

## Best Practices

- Always use managed associations in CAP (no `on` condition)
- Name parent field `parent` for auto `parent_ID` foreign key
- Create 2-3 hierarchy levels minimum for demo
- Test with different data volumes
- Clear browser cache after backend changes

**CAP Specific:**
- Use CDS MCP to search model before editing
- Run `cds watch` to reload data
- Check metadata endpoint for hierarchy annotations

**RAP Specific:**
- Always use ADT MCP when available
- Verify `@OData.hierarchy.recursiveHierarchy` annotation in projection view

**Metadata Extension Rules:**
- ✅ **Add UI annotations** (`@UI.lineItem`, `@UI.identification`, `@UI.selectionField`) **and `@EndUserText.label` for business-relevant fields only**
  - For example: CategoryName, Description, OrgUnitName, ManagerName, Location
- ❌ **NEVER add UI annotations** (`@UI.lineItem`, `@UI.identification`, `@UI.selectionField`) **for technical/system fields:**
  - ❌ UUID (technical key)
  - ❌ LocalCreatedBy (audit field)
  - ❌ LocalCreatedAt (audit field)
  - ❌ LocalLastChangedBy (audit field)
  - ❌ LocalLastChangedAt (audit field)
  - ❌ LastChangedAt (audit field)
  - ❌ Parent field (e.g., ParentCategory, ParentOrgUnit) - used internally for hierarchy structure

## ✅ Implementation Verification Checklist

**Before claiming completion, verify:**

### Documentation Fetched (if available):
- [ ] Fetched or referenced the 7 SAP Help Portal pages for the current patterns
- [ ] Extracted official implementation patterns
- [ ] Applied patterns to specific use case

### CAP Objects Configured (for CAP projects):
- [ ] Self-referencing managed association added to db/schema.cds
- [ ] `@hierarchy` annotation on service entity in srv/<service>.cds
- [ ] manifest.json controlConfiguration has `type: "TreeTable"`
- [ ] hierarchyQualifier set consistently with entity (e.g., `<EntityName>Hierarchy`)
- [ ] Sample CSV in db/data/ with `parent_ID` column and empty parent_ID for roots
- [ ] Service runs with `cds watch` without errors

### ABAP Objects Created (for RAP projects):
- [ ] Database table has parent field (UUID/ID type)
- [ ] Interface view has self-referencing association with correct `on` clause
- [ ] Hierarchy definition uses `define hierarchy` syntax
- [ ] Hierarchy has `start where <ParentField> is initial` clause
- [ ] Projection view has `@OData.hierarchy.recursiveHierarchy` annotation
- [ ] Projection view redirects association: `_Parent : redirected to ProjectionView`
- [ ] All objects activated in correct order

### Fiori App Configured:
- [ ] manifest.json has `"type": "TreeTable"`
- [ ] manifest.json has `hierarchyQualifier` matching hierarchy name
- [ ] Dependencies installed (`npm install`)

---

## References

- **CAP Hierarchy Guide**: https://cap.cloud.sap/docs/guides/uis/fiori#fiori-tree-views (Serving SAP Fiori UIs → Fiori Tree Views)
- **ABAP RAP Hierarchies**: https://help.sap.com/docs/abap-cloud/abap-rap/implementing-hierarchical-view