---
name: sap-fiori-tree-table
description: Configure hierarchical tree table to SAP Fiori elements application for displaying parent-child recursive hierarchies. Supports CAP and ABAP RAP (OData V4).
argument-hint: Entity, parent field, hierarchy qualifier
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
- ✅ Entity uses `cuid` or has UUID primary key
- ✅ CDS-MCP server tools available

### 1. Check Current Entity Structure
Use `cds-mcp` → `search_model` with projectPath, entityName, kind="entity"

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
✅ **hierarchyQualifier** with descriptive name

### 5. Create Sample Hierarchical Data
Create CSV at `db/data/<namespace>-<EntityName>.csv`:

```csv
ID;Name;Description;parent_ID
uuid-1;Electronics;;
uuid-2;Computers;;uuid-1
uuid-3;Laptops;;uuid-2
uuid-4;Desktops;;uuid-2
uuid-5;Home & Garden;;
uuid-6;Furniture;;uuid-5
```

✅ **Use `parent_ID`** (with underscore!)  
✅ **Root items have empty parent_ID**  
✅ **Valid UUID format**

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
**🚨 CRITICAL: ALWAYS FETCH SAP DOCUMENTATION FIRST 🚨**

**MANDATORY STEP - DO NOT SKIP:**
1. **BEFORE any ABAP implementation, you MUST call `fetch_webpage` tool** to retrieve the latest official SAP documentation
2. **Use ALL of these SAP Help Portal URLs** (fetch all pages):

   - **[Developing Apps with Hierarchical Data Structures](https://help.sap.com/docs/abap-cloud/abap-rap/implementing-hierarchical-view)** - Overview
   - **[Treeviews with Read-Only Capabilities](https://help.sap.com/docs/abap-cloud/abap-rap/treeview-with-read-only-capability)** - Architecture
   - **[Creating the Database Table](https://help.sap.com/docs/abap-cloud/abap-rap/creating-database-table)** - Parent-child table structure
   - **[Creating the Interface View](https://help.sap.com/docs/abap-cloud/abap-rap/creating-interface-view)** - Self-association logic
   - **[Creating the Hierarchy Node](https://help.sap.com/docs/abap-cloud/abap-rap/creating-hierarchy-node)** - Hierarchy definition
   - **[Creating the Projection View](https://help.sap.com/docs/abap-cloud/abap-rap/creating-consumption-view)** - Projection with redirected association
   - **[Displaying Treeview on SAP Fiori UI](https://help.sap.com/docs/abap-cloud/abap-rap/hierarchical-treeview-on-ui)** - UI configuration

3. **Extract implementation patterns** from fetched documentation
4. **Apply patterns** to the specific entity and package

**Example fetch_webpage usage:**
```
fetch_webpage(
  query: "ABAP RAP hierarchy, interface view self-referencing association, define hierarchy syntax, projection view redirect",
  urls: [all 7 URLs above]
)
```

**WHY THIS IS CRITICAL:**
- ❌ **DO NOT implement from memory or skill examples alone**
- ❌ **DO NOT assume syntax hasn't changed**
- ✅ **ALWAYS use current SAP documentation** - APIs and patterns evolve
- ✅ **Official docs show exact syntax** including annotations like `@OData.hierarchy.recursiveHierarchy`
- ✅ **Prevents outdated or incorrect implementations**

**After fetching documentation, implement:**

**CRITICAL Requirements (from fetched SAP documentation):**
- ✅ Database table with parent field (e.g., `parent_uuid`, `manager`)
- ✅ Interface view must have self-referencing association
  ```abap
  association [0..1] to INTERFACE_VIEW as _Parent on $projection.ParentID = _Parent.ID
  ```
- ✅ Hierarchy uses `define hierarchy` syntax (not `define view entity`)
  ```abap
  define hierarchy HIERARCHY_NAME as parent child hierarchy(
    source INTERFACE_VIEW
    child to parent association _Parent
    start where ParentID is initial
    siblings order by Name
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
- Use `cds-mcp` to search model before editing
- Run `cds watch` to reload data
- Check metadata endpoint for hierarchy annotations

**RAP Specific:**

**Implementation Guidelines:**
- ✅ **ALWAYS fetch SAP Help Portal documentation first** using `fetch_webpage` tool
- ✅ Use official SAP patterns from fetched docs, not skill examples
- ✅ Verify `@OData.hierarchy.recursiveHierarchy` annotation in projection view
- ✅ Always use ADT MCP when available

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

### Documentation Fetched:
- [ ] Called `fetch_webpage` with all 7 SAP Help Portal URLs
- [ ] Extracted official implementation patterns
- [ ] Applied patterns to specific use case

### ABAP Objects Created:
- [ ] Database table has parent field (UUID/ID type)
- [ ] Interface view has self-referencing association with correct `on` clause
- [ ] Hierarchy definition uses `define hierarchy` syntax
- [ ] Hierarchy has `start where ParentID is initial` clause
- [ ] Projection view has `@OData.hierarchy.recursiveHierarchy` annotation
- [ ] Projection view redirects association: `_Parent : redirected to ProjectionView`
- [ ] All objects activated in correct order

### Fiori App Configured:
- [ ] manifest.json has `"type": "TreeTable"`
- [ ] manifest.json has `hierarchyQualifier` matching hierarchy name
- [ ] Dependencies installed (`npm install`)

---

## References

- **CAP Hierarchy**: https://cap.cloud.sap/docs/releases/2025/jun25#hierarchy-maintenance-in-tree-views
- **ABAP RAP Hierarchies**: https://help.sap.com/docs/abap-cloud/abap-rap/implementing-hierarchical-view