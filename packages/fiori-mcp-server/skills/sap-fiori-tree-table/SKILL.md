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

## Environment Requirements

**CAP Projects:**
- ✅ **VS Code or SAP Business Application Studio (BAS)** - Both environments supported
- ✅ **Fiori MCP Server** - Required for Fiori app generation and modification (VS Code only)
- ✅ **CDS MCP Server** - Required for CDS model queries

**ABAP RAP Projects:**
- ✅ **VS Code only** - ABAP Development Tools extension is VS Code-specific
- ✅ **Fiori MCP Server** - Required for Fiori app generation and modification
- ✅ **ABAP Development Tools for VS Code extension** - Required for backend development (includes ADT MCP server for RAP operations)

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

### For ABAP RAP Projects:
1. **Package name** - Where to create or find backend hierarchy objects ($TMP for local, or specific package like Z_MAINT)
2. **Transport Required**: Depends on package type (No for local packages like $TMP, Yes for transportable packages)
3. **Entity name** - The entity to make hierarchical (e.g., "Equipment", "Category", "FunctionalLocation")

### For CAP Projects:
1. **Entity name** - The entity to make hierarchical (e.g., "Travel", "Category", "ProductCategory")

**DO NOT proceed with implementation until all inputs are confirmed.**

---

## CAP Implementation

📖 **[Complete CAP Implementation Guide](./references/cap/implementation.md)**

**Quick Summary:**
- 6-step process: Check entity → Add association → Add @hierarchy → Configure manifest → Create data → Test
- Supports UUID, String, and Integer keys (single key only)
- Requires @sap/cds 9.6.0+ and OData V4
- Use CDS MCP to search model before editing

---

## ABAP RAP Implementation

📖 **[Complete RAP Implementation Guide](./references/rap/implementation.md)**

**Quick Summary:**
- 4-step process: Check existing hierarchy → Implement backend → Configure manifest → Test
- **Decision required:** Read-only (List Report only) vs. Editable (with Object Page)
- For detailed backend implementation:
  - [Read-Only Treeviews Guide](./references/rap/detailed-guides/1-read-only-treeviews.md)
  - [Editable Treeviews Guide](./references/rap/detailed-guides/2-editable-treeviews.md)

---

## Quick Troubleshooting

### CAP Common Issues
- **"@hierarchy not supported"** → Use managed association (no `on` condition)
- **"table has no column"** → Use `parent_ID` (with underscore) in CSV
- **"TreeTable not rendering"** → Check `type: "TreeTable"` and `hierarchyQualifier` in manifest

### ABAP RAP Common Issues
- **"Element must not be search enabled"** → Remove `@Search` annotations from hierarchy projection view
- **"Primary keys do not match"** → Child table needs composite key (child UUID + parent UUID)

📖 **Full error reference in implementation guides**

---

## Key Differences

**CAP:**
- Managed association in entity
- `@hierarchy` annotation on service
- CSV data with `parent_ID` column
- Test with `npm run watch`

**ABAP RAP:**
- CDS view with `@OData.hierarchy.recursiveHierarchy`
- Qualifier in metadata
- Test data in database tables
- Test with `npm start` or `npm run start-mock`