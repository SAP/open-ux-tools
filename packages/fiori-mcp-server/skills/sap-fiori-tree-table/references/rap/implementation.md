# ABAP RAP Tree Table Implementation Guide

## Prerequisites
- ✅ VS Code environment with SAP Fiori MCP Server and ABAP Development Tools for VS Code extension
- ✅ ABAP system with RAP and OData V4 support
- ✅ RAP backend such as SAP BTP ABAP Environment or SAP S/4HANA Public Cloud Edition, must run on version 2602 or higher

---

## ⚠️ Important Restrictions

- **Tree table cannot be displayed with a draft-enabled service in the flexible column layout**
- **Search annotations must be removed:** Remove `@Search.searchable` and `@Search.defaultSearchElement` annotations from projection views with `@OData.hierarchy.recursiveHierarchy` annotation. The OData hierarchy specification conflicts with search capabilities - hierarchical nodes use special query parameters that are incompatible with standard search operations.

---

## 0. Decision: Read-Only vs. Editable Hierarchy

**CRITICAL: Understand the fundamental differences between hierarchy types**

### Read-Only Hierarchy (WITHOUT Directory Table)
- **Display Location:** List Report page ONLY
- **Cannot be shown:** Object Page (no composition support without directory)
- **Capabilities:** View-only, navigation, filtering
- **Use Case:** Display organizational charts, browse categories, view reporting structure
- **Backend:** Simple self-referencing association, no directory table
- **Example:** Employee list showing manager-employee hierarchy on main page

### Editable Hierarchy (WITH Directory Table)
- **Display Location:** List Report AND Object Page
- **Required:** Directory table pattern with composition
- **Capabilities:** Create, delete, move nodes, draft handling, inline creation
- **Use Case:** Manage hierarchical data, modify structure, transactional operations
- **Backend:** Directory + hierarchy tables, managed associations, draft support
- **Example:** Department object page showing editable employee hierarchy in subsection

### Decision Criteria

**Use READ-ONLY when:**
- User wants: "display", "view", "browse", "show", "list"
- Hierarchy appears: On main List Report page only
- No editing needed
- 📖 **Reference:** [Read-Only Treeviews Guide](./detailed-guides/1-read-only-treeviews.md)

**Use EDITABLE when:**
- User wants: "edit", "create", "delete", "manage", "modify"
- Hierarchy appears: On Object Page (as child composition)
- Transactional operations required
- 📖 **Reference:** [Editable Treeviews Guide](./detailed-guides/2-editable-treeviews.md)

**When in doubt, ask:**
> "1. Where should the hierarchy appear? (List Report only, or Object Page subsection?)
> 2. Do you need to edit the hierarchy (create/delete/move nodes) or just view it?"

---

## Implementation Steps

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

### 2. Implement Hierarchy in Backend

**Implementation Guides:**
- **[Read-Only Treeviews Guide](./detailed-guides/1-read-only-treeviews.md)** - 6-step implementation for read-only hierarchies
- **[Editable Treeviews Guide](./detailed-guides/2-editable-treeviews.md)** - 9-step implementation with draft, directories, and actions

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

**"Element X must not be search enabled in baseview"**
- Remove `@Search.searchable` and `@Search.defaultSearchElement` annotations from projection view with `@OData.hierarchy.recursiveHierarchy`
- See detailed solution in [Troubleshooting Guide](./detailed-guides/2.4-troubleshooting-checklist.md)

**"Primary keys do not match"**
- Child table must have composite key (child UUID + parent UUID both as keys)
- See detailed solution in [Troubleshooting Guide](./detailed-guides/2.4-troubleshooting-checklist.md)

---

## Best Practices

- Use exact Qualifier values from metadata (case-sensitive)
- Test with both mock data and live backend
- Clear browser cache after backend changes
- Consult troubleshooting guide for common issues

---

## Reference

- **ABAP RAP Hierarchies**: https://help.sap.com/docs/abap-cloud/abap-rap/implementing-hierarchical-view
