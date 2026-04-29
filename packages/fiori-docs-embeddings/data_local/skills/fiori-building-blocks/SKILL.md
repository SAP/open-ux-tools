---
name: fiori-building-blocks
description: 'Add SAP Fiori Elements building blocks (RichTextEditor, Table, Chart, Form) to custom sections in Object Pages. Use for: adding rich text editor to display/edit formatted fields, creating custom sections with building blocks, extending Fiori Elements OData V4 apps with fragment-based custom content.'
argument-hint: 'building block type (e.g., RichTextEditor) and field name'
---

# Fiori Elements Building Blocks in Custom Sections

Add SAP Fiori Elements building blocks to custom sections on Object Pages using fragments and manifest configuration.

## When to Use

- Add a **RichTextEditor** to display/edit formatted text fields (memo, description, notes)
- Add a **Table**, **Chart**, or **Form** building block to a custom section
- Extend a Fiori Elements Object Page with custom fragment-based content
- Use building blocks with proper OData bindings in custom sections

## Prerequisites

- Fiori Elements OData V4 application with Object Page
- MCP Fiori server available for documentation search
- Knowledge of the entity property to bind to

## Workflow

### 1. Identify Requirements

**Gather:**
- Building block type (RichTextEditor, Table, Chart, Form, etc.)
- Target entity property/field name
- Section title and positioning preference

**Example:** "Add rich text editor for the Memo field in a new section called Trip Description"

### 2. Search MCP Documentation

Search for building block syntax and configuration:

```
Search queries:
- "rich text editor building block" 
- "RichTextEditor fragment syntax"
- "custom section object page OData V4"
- "<building-block-name> building block"
```

**Key findings to extract:**
- Required XML namespaces
- Building block element name and attributes
- Binding syntax (value, metaPath, etc.)
- Optional configuration (buttonGroups, plugins, etc.)

### 3. Examine Data Model

Read the metadata or service definition to verify:
- Entity type name
- Property name and data type
- Property annotations (if any)

**Files to check:**
- `webapp/localService/mainService/metadata.xml` (OData metadata)
- Service CDS definitions (if available)

### 4. Create Fragment File

**Location:** `webapp/ext/fragment/<FragmentName>.fragment.xml`

**Template for RichTextEditor:**
```xml
<core:FragmentDefinition
	xmlns:core="sap.ui.core"
	xmlns="sap.m"
	xmlns:macros="sap.fe.macros"
>
	<macros:RichTextEditor value="{PropertyName}" id="richTextEditor<PropertyName>" />
</core:FragmentDefinition>
```

**Common Building Blocks:**

| Building Block | Element | Key Attributes |
|---|---|---|
| RichTextEditor | `macros:RichTextEditor` | `value="{Property}"` or `metaPath="Property"` |
| Table | `macros:Table` | `metaPath="@com.sap.vocabularies.UI.v1.LineItem"` |
| Chart | `macros:Chart` | `metaPath="@com.sap.vocabularies.UI.v1.Chart"` |
| Field | `macros:Field` | `metaPath="Property"` |

**Note:** 
- Use `value="{Property}"` for direct data binding
- Use `metaPath="Property"` when binding requires metadata/annotation resolution
- `RichTextEditorWithMetadata` requires annotation term path, not just property name

### 5. Update Manifest Configuration

**Location:** `webapp/manifest.json`

**Find:** `sap.ui5.routing.targets.<ObjectPageTarget>.options.settings`

**Add:** Custom section configuration under `content.body.sections`

```json
{
  "content": {
    "body": {
      "sections": {
        "<sectionKey>": {
          "name": "<namespace>.ext.fragment.<FragmentName>",
          "type": "XMLFragment",
          "title": "Section Title",
          "position": {
            "placement": "After",
            "anchor": "<existingSectionId>"
          }
        }
      }
    }
  }
}
```

**Key Configuration:**
- `name`: Full fragment namespace path (e.g., `travelapp.ext.fragment.TripDescription`)
- `type`: Always `"XMLFragment"`
- `title`: Display label for the section
- `position`: Optional; controls placement relative to other sections
  - `placement`: "Before", "After", or omit for last position
  - `anchor`: ID of existing section to place relative to

**To add as last section (simplest):**
```json
{
  "content": {
    "body": {
      "sections": {
        "<sectionKey>": {
          "name": "<namespace>.ext.fragment.<FragmentName>",
          "type": "XMLFragment",
          "title": "Section Title"
        }
      }
    }
  }
}
```

### 6. Validate and Fix Errors

**Check for errors** in both files:
- Fragment XML: Verify namespaces, binding syntax, property names
- Manifest JSON: Verify fragment path matches namespace and file location

**Common Issues:**

| Error | Cause | Fix |
|---|---|---|
| "Path value must end with annotation term" | Using `metaPath` with RichTextEditor without annotation | Use `value="{Property}"` instead |
| Fragment not found | Namespace mismatch | Ensure `name` in manifest matches: `<app-id>.ext.fragment.<FragmentName>` |
| Property not found | Wrong property name | Verify property exists in entity metadata |
| Section not appearing | Missing from manifest | Check section registered in correct target settings |

**Validation checklist:**
- [ ] Fragment file exists at `webapp/ext/fragment/<FragmentName>.fragment.xml`
- [ ] Fragment namespace matches app component namespace
- [ ] Property name matches entity metadata
- [ ] Manifest section `name` matches fragment namespace path
- [ ] No compilation errors in fragment or manifest
- [ ] Section appears in Object Page (test in preview)

## Building Block Reference

### RichTextEditor

**Use for:** Formatted text fields (HTML content, memo, description)

**Basic syntax:**
```xml
<macros:RichTextEditor value="{Memo}" id="rteDemo" />
```

**With toolbar customization:**
```xml
<macros:RichTextEditor value="{Description}" id="rteCustom">
	<macros:buttonGroups>
		<richtexteditor:ButtonGroup 
			name="font-style" 
			visible="true" 
			priority="10" 
			buttons="bold,italic,underline" />
	</macros:buttonGroups>
</macros:RichTextEditor>
```

**Required namespace:** `xmlns:macros="sap.fe.macros"`

### Table

**Use for:** Display line items, collections, navigation properties

**Basic syntax:**
```xml
<macros:Table 
	id="customTable"
	metaPath="to_Items/@com.sap.vocabularies.UI.v1.LineItem"
	readOnly="false" />
```

### Chart

**Use for:** Data visualization from Chart annotations

**Basic syntax:**
```xml
<macros:Chart 
	id="customChart"
	metaPath="@com.sap.vocabularies.UI.v1.Chart" />
```

### Field

**Use for:** Single editable field with label

**Basic syntax:**
```xml
<macros:Field 
	id="customField"
	metaPath="PropertyName" />
```

## Tips

- **Start simple:** Use basic building block syntax first, add configuration later
- **Check examples:** Search MCP docs for complete working examples
- **Use existing sections:** Check annotation.xml for existing UI.Facets to understand section patterns
- **Fragment reuse:** Fragments can be referenced from multiple pages/sections
- **Namespace consistency:** App namespace comes from manifest `sap.app.id`

## Related Documentation

When MCP Fiori server is available, search for:
- "building blocks fiori elements"  
- "custom section fragment"
- "object page extensions"
- Specific building block name (e.g., "RichTextEditor", "Table macro")

## Example: Add RichTextEditor for Memo Field

**Goal:** Add Trip Description section with rich text editor for Memo field

**Step 1:** Search MCP
```
Query: "rich text editor building block"
Found: RichTextEditor uses value="{Property}" for data binding
```

**Step 2:** Check metadata
```xml
<!-- metadata.xml -->
<Property Name="Memo" Type="Edm.String" MaxLength="1024"/>
```

**Step 3:** Create fragment
```xml
<!-- webapp/ext/fragment/TripDescription.fragment.xml -->
<core:FragmentDefinition
	xmlns:core="sap.ui.core"
	xmlns="sap.m"
	xmlns:macros="sap.fe.macros"
>
	<macros:RichTextEditor value="{Memo}" id="richTextEditorMemo" />
</core:FragmentDefinition>
```

**Step 4:** Update manifest
```json
"TravelObjectPage": {
  "options": {
    "settings": {
      "contextPath": "/Travel",
      "content": {
        "body": {
          "sections": {
            "tripDescriptionSection": {
              "name": "travelapp.ext.fragment.TripDescription",
              "type": "XMLFragment",
              "title": "Trip Description"
            }
          }
        }
      }
    }
  }
}
```

**Step 5:** Validate - no errors, section appears as last section on Object Page ✓
