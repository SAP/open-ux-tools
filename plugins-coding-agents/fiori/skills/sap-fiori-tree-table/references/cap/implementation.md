# CAP Tree Table Implementation Guide

## Prerequisites
- ✅ VS Code or SAP Business Application Studio environment
- ✅ Fiori MCP Server (VS Code) for app modifications
- ✅ Existing CAP project with CDS entity
- ✅ SAP Fiori Elements List Report application
- ✅ CAP service must be exposed as OData V4 (recursive hierarchy is V4-only)
- ✅ Entity must have a **single key field** (UUID, String, or Integer)
- ✅ CDS MCP server tools available
- ✅ @sap/cds version 9.6.0 or higher (required for @hierarchy annotation support)

**Key Types Supported:**
- ✅ **UUID keys** (using `cuid`) - Traditional approach
- ✅ **String keys** (e.g., `key categoryID : String(10)`) - Business keys like "CAT-001"
- ✅ **Integer keys** (e.g., `key id : Integer`) - Numeric identifiers
- ⚠️ **Composite keys are NOT supported** for hierarchies

---

## Implementation Steps

### 1. Check Current Entity Structure
Use the CDS MCP to search the model for the target entity structure before making changes

### 2. Add Hierarchy Association
Add self-referencing managed association to `db/schema.cds`:

**Option A: With UUID key (using cuid)**
```cds
entity <EntityName> : cuid, managed {
  // ... existing fields ...
  parent : Association to <EntityName>;  // ← Add this managed association
  // ... rest of entity ...
}
```

**Option B: With Business Key (String/Integer)**
```cds
entity <EntityName> : managed {
  key categoryID : String(10);  // Your business key
  // ... existing fields ...
  parent : Association to <EntityName>;  // ← Add this managed association
  // ... rest of entity ...
}
```

✅ **Must be managed** (no `on` condition)  
✅ **Name it `parent`** (creates `parent_<keyname>` foreign key)
✅ **Single key only** (composite keys not supported for hierarchies)

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

**For UUID keys (using cuid):**
```csv
ID;Name;Description;parent_ID
11111111-1111-1111-1111-111111111111;Electronics;;
22222222-2222-2222-2222-222222222222;Computers;;11111111-1111-1111-1111-111111111111
33333333-3333-3333-3333-333333333333;Laptops;;22222222-2222-2222-2222-222222222222
44444444-4444-4444-4444-444444444444;Desktops;;22222222-2222-2222-2222-222222222222
55555555-5555-5555-5555-555555555555;Home & Garden;;
66666666-6666-6666-6666-666666666666;Furniture;;55555555-5555-5555-5555-555555555555
```

**For Business keys (String keys):**
```csv
categoryID;name;description;parent_categoryID
CAT-001;Electronics;;
CAT-002;Computers;;CAT-001
CAT-003;Laptops;;CAT-002
CAT-004;Desktops;;CAT-002
CAT-008;Home & Garden;;
CAT-009;Furniture;;CAT-008
```

✅ **Use `parent_<keyname>`** (with underscore!) - e.g., `parent_ID` or `parent_categoryID`  
✅ **Root items have empty parent field**  
✅ **For UUID: Valid UUID format** (use real UUIDs for production data)
✅ **For String: Use your business key values** (e.g., CAT-001, PROD-123)

### 6. Test
```bash
npm run watch-<app-name>
```

---

## Common Errors and Solutions

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
- Entity must have a single key field (UUID, String, or Integer)
- Parent association must be self-referencing
- Composite keys are not supported

**"hierarchyQualifier not found"**
- Verify `@hierarchy` in `srv/<service>.cds`
- Check metadata: `http://localhost:<port>/service/$metadata`
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
- Correct foreign key column name: `parent_<keyname>` (e.g., `parent_ID` or `parent_categoryID`)
- Valid key values matching the key field type (UUIDs for cuid, strings for String keys)
- Run `cds watch` to load data

---

## Best Practices

- Always use managed associations (no `on` condition)
- Name the parent field `parent` for automatic `parent_<keyname>` foreign key generation
- **Key flexibility**: Use UUID keys for maximum compatibility, or business keys (String/Integer) for better readability
- When using business keys, ensure they are unique and meaningful (e.g., CAT-001, DEPT-HR)
- Create 2-3 hierarchy levels at minimum for demo
- Test with different data volumes
- Clear browser cache after backend changes
- Use the CDS MCP to search the model before editing
- Run `cds watch` to reload data
- Check the metadata endpoint for hierarchy annotations
- The foreign key column follows the pattern: `parent_<keyFieldName>` (e.g., `parent_ID`, `parent_categoryID`, `parent_code`)

---

## Reference

- **CAP Hierarchy Guide**: https://cap.cloud.sap/docs/guides/uis/fiori#fiori-tree-views (Serving SAP Fiori UIs → Fiori Tree Views)
