---
name: create-hierarchy-tree-table
description: 'Automatically create a recursive hierarchy data model in a CAP project and configure it to display as a tree table in a SAP Fiori Elements List Report application. Use for: displaying parent-child relationships, building organizational hierarchies, creating category trees, showing nested structures, implementing recursive hierarchies.'
argument-hint: 'entity name, namespace, service name, and app path'
---

# Skill: Create Hierarchical Tree Table in SAP Fiori Elements

## When to Use This Skill
- When you need to display parent-child relationships in a tree structure
- When building organizational hierarchies, category trees, or nested structures
- When the user requests "recursive hierarchy", "tree table", "parent-child data", or "hierarchical display"

## Prerequisites
- Existing CAP project with CDS entity
- SAP Fiori Elements List Report application
- Entity must use `cuid` or have a UUID primary key

## Parameters Required
- `entityName`: The name of the entity to make hierarchical (e.g., "Travel", "Category", "Task")
- `namespace`: The CDS namespace (e.g., "sap.fe.cap.travel")
- `serviceName`: The service name (e.g., "TravelService")
- `appPath`: Path to the Fiori app folder (e.g., "app/travelmanagement")

## Implementation Steps

### Step 1: Check Current Entity Structure
**Action:** Use `cds-mcp` server to search for the entity definition
```
Tool: use_mcp_tool
Server: cds-mcp
Tool: search_model
Arguments: {
  "projectPath": "<project-root>",
  "name": "<entityName>",
  "kind": "entity"
}
```

### Step 2: Update Entity with Hierarchy Association
**Action:** Add self-referencing managed association to the entity

**Pattern to add:**
```cds
entity <EntityName> : cuid, managed {
  // ... existing fields ...
  
  // Add hierarchy support
  parent : Association to <EntityName>;
  
  // ... rest of entity ...
}
```

**Implementation:**
```
Tool: replace_in_file
Path: db/schema.cds
```

**Rules:**
- Use managed association (no `on` condition)
- Name it `parent` (convention creates `parent_ID` foreign key)
- Add before compositions or at end of entity definition

### Step 3: Add Hierarchy Annotation to Service
**Action:** Add `@hierarchy` annotation to entity projection in service

**Pattern to add:**
```cds
service <ServiceName> @(path: '/<path>') {
  @hierarchy
  entity <EntityName> as projection on db.<EntityName> {
    *,
    // ... redirected associations ...
  };
}
```

**Implementation:**
```
Tool: replace_in_file
Path: srv/<service-name>.cds
```

**Rules:**
- Add `@hierarchy` annotation before the entity definition
- Keep all existing projections and redirections
- Verify the annotation is on the service entity, not the database entity

### Step 4: Configure TreeTable in Manifest
**Action:** Update Fiori app manifest.json to use TreeTable

**Pattern to modify in List Report target:**
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

**Implementation:**
```
Tool: replace_in_file
Path: <appPath>/webapp/manifest.json
```

**Rules:**
- Locate the List Report target (not Object Page)
- Change existing `tableSettings.type` from "ResponsiveTable" to "TreeTable"
- Add `hierarchyQualifier` with descriptive name
- Keep all other settings intact

### Step 5: Create or Update Sample Data
**Action:** Create hierarchical sample data with parent-child relationships

**CSV Format:**
```csv
ID;Field1;Field2;...;parent_ID
<uuid-1>;Root Item 1;...;
<uuid-2>;Child 1-1;...;<uuid-1>
<uuid-3>;Child 1-2;...;<uuid-1>
<uuid-4>;Root Item 2;...;
<uuid-5>;Child 2-1;...;<uuid-4>
```

**Implementation:**
```
Tool: write_to_file
Path: db/data/<namespace>-<EntityName>.csv
```

**Rules:**
- Use `parent_ID` as column name (with underscore)
- Use valid UUID format for IDs
- Leave `parent_ID` empty for root items (top level)
- Ensure parent IDs reference existing records
- Create at least 2-3 hierarchy levels for demo

**Sample Structure:**
- 3-4 root items (no parent)
- 2-3 children per root
- 1-2 grandchildren to show depth

### Step 6: Test the Implementation
**Action:** Start the application and verify

**Implementation:**
```
Tool: execute_command
Command: cd <project-root> && npm run watch-<app-name>
```

**Verification Checklist:**
- [ ] Application starts without errors
- [ ] No CDS compilation warnings about @hierarchy
- [ ] Data loads successfully
- [ ] List Report displays
- [ ] Tree expand/collapse controls visible
- [ ] Hierarchy structure matches data model

## Common Errors and Solutions

### Error: "@hierarchy is not supported for unmanaged association"
**Cause:** Using unmanaged association with `on` condition
**Solution:** Remove the `on` clause, use managed association:
```cds
// ❌ Wrong
parent : Association to Travel on parent.ID = parentID;

// ✅ Correct
parent : Association to Travel;
```

### Error: "table has no column named parentID"
**Cause:** CSV file uses wrong column name
**Solution:** Use `parent_ID` with underscore in CSV header

### Error: "No artifact has been found with name 'cuid'"
**Cause:** Missing import statement
**Solution:** Add at top of schema.cds:
```cds
using { Currency, managed, cuid } from '@sap/cds/common';
```

### Warning: "@hierarchy is ignored as no managed association to self exists"
**Cause:** Association is not properly configured as managed
**Solution:** Verify association has no `on` condition and references same entity type

## Output Deliverables

After successful execution, the following changes will be made:

1. **Updated Entity Schema** (`db/schema.cds`)
   - Self-referencing `parent` association added

2. **Updated Service Definition** (`srv/<service>.cds`)
   - `@hierarchy` annotation added to entity

3. **Updated Manifest** (`app/<app>/webapp/manifest.json`)
   - TreeTable configuration in List Report

4. **Sample Hierarchical Data** (`db/data/<namespace>-<Entity>.csv`)
   - Multi-level parent-child records

5. **Running Application**
   - Tree table visible in List Report
   - Expand/collapse controls functional

## Usage Example

**User Request:**
"Create a recursive hierarchy for the Category entity and show it in a tree table"

**Skill Execution:**
1. Search for Category entity using cds-mcp
2. Add `parent: Association to Category;` to entity
3. Add `@hierarchy` to service entity
4. Update manifest.json with TreeTable config
5. Create sample data with category hierarchy
6. Start application with npm run watch

**Expected Result:**
- Categories displayed in tree structure
- Parent categories expandable to show children
- Multiple levels of nesting visible

## Tips for Customization

1. **Deeper Hierarchies:** Add more levels in sample data
2. **Different Field Names:** Use meaningful association names, but keep CSV as `<name>_ID`
3. **UI Annotations:** Add @UI.LineItem annotations for better column display
4. **Validation Logic:** Add business logic to prevent circular references
5. **Performance:** Consider pagination for large datasets

## References

- CAP Associations: https://cap.cloud.sap/docs/cds/cdl#associations
- Fiori TreeTable: https://sapui5.hana.ondemand.com/#/topic/c337707a119c4e6ca7b8800858bb5f1c
- OData Hierarchy: https://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/

## Version History

- v1.0 (2026-04-01): Initial skill creation for CAP + Fiori Elements hierarchies