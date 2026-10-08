---
name: sap-fiori-add-visual-filter
description: Add visual filters (chart-based) to SAP Fiori Elements filter bar or value help using CAP or ABAP RAP. Use when asked to add chart filters, bar chart selectors, or visual filter bars to a Fiori Elements application.
argument-hint: field name (e.g., Category, Status)
metadata:
  author: sap-fiori-tools
  version: "0.0.6"
---

# SAP Fiori Visual Filter

## Purpose
Add **chart-based filters (Bar/Line)** to filter bar or value help dialog (OData V4).

---

## Prerequisites

**CAP Projects:**
- ✅ **VS Code or SAP Business Application Studio (BAS)** - Both environments supported
- ✅ **Fiori MCP Server** - Required for Fiori app modification (VS Code only)

**ABAP RAP Projects:**
- ✅ **VS Code only** - ABAP Development Tools extension is VS Code-specific
- ✅ **Fiori MCP Server** - Required for Fiori app modification
- ✅ **ABAP Development Tools for VS Code extension** - Required for backend development (includes ADT MCP server for RAP operations)

---

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

1. **Entity** - Which entity to add the visual filter to
2. **Dimension field** - The field to filter by (e.g., Category, Status, Destination)
3. **Measure field** - The numeric field to aggregate (e.g., Amount, TotalPrice, ReservationPrice)
4. **Aggregation method** - How to aggregate (see valid values below)
5. **Chart type** - Bar or Line (recommend Bar as default)

**DO NOT proceed with implementation until all inputs are confirmed.**

---

## CAP Implementation

### Enable Aggregation (MANDATORY)
```cds
@Aggregation.ApplySupported: {
  Transformations: ['aggregate','groupby'],
  AggregatableProperties: [{ Property: Amount }],
  GroupableProperties: [Category]
}
```

### Aggregated Property (Measure)
```cds
Analytics.AggregatedProperty #Amount_sum : {
  $Type: 'Analytics.AggregatedPropertyType',
  Name: 'Amount_sum',
  AggregatableProperty: Amount,
  AggregationMethod: 'sum',
  ![@Common.Label]: 'Total Amount'
}
```

**Valid `AggregationMethod` values (lowercase string):**
- `sum` - Sum of the non-null values
- `min` - Smallest of the non-null values
- `max` - Largest of the non-null values
- `average` - Sum of non-null values divided by count of non-null values
- `countdistinct` - Count of distinct values, omitting null values

⚠️ **CRITICAL:** Must be a **lowercase string** (e.g., `'sum'`), **NOT** an enum (e.g., `#SUM`). Using an enum will cause SQL generation errors.

### Chart Annotation
```cds
UI.Chart #visualFilter : {
  ChartType: #Bar,
  Dimensions: [Category],
  DynamicMeasures: ['@Analytics.AggregatedProperty#Amount_sum']
}
```

✅ Uses **DynamicMeasures**

### PresentationVariant
```cds
UI.PresentationVariant #visualFilter: {
  Visualizations: ['@UI.Chart#visualFilter']
}
```

### ValueList (on Dimension Field)
```cds
Category @Common.ValueList #visualFilter: {
  $Type: 'Common.ValueListType',
  CollectionPath: 'EntityName',
  Parameters: [
    { $Type: 'Common.ValueListParameterInOut', LocalDataProperty: Category, ValueListProperty: 'Category' }
  ],
  PresentationVariantQualifier: 'visualFilter'
}
```

### SelectionFields
```cds
UI.SelectionFields: [Category]
```

### Manifest configuration (MANDATORY)
refer to the "Manifest Configuration" section below.

---

## ABAP RAP Implementation (4 Steps)

### CRITICAL: NEVER EDIT metadata.xml - IT IS READ-ONLY!

### ⚠️ PRE-FLIGHT CHECKLIST - Verify BEFORE Implementation

**Missing ANY of these will cause the visual filter to fail:**

- [ ] `@OData.applySupportedForAggregation: #FULL` on **projection view** (ZC_*)
- [ ] `@Aggregation.default: #SUM` (or #AVG, #MIN, #MAX) on **measure field**
- [ ] `@UI.chart` annotation with correct **qualifier** in metadata extension
- [ ] `@UI.selectionField` on dimension field
- [ ] Frontend `Common.ValueList` annotation in annotation.xml
- [ ] Manifest `controlConfiguration` with visual filter settings
- [ ] All CDS objects **activated**

---

### 1. Backend Projection View (MANDATORY) - Enable Aggregation Support

⚠️ **CRITICAL: @OData.applySupportedForAggregation annotation is MANDATORY**

**WITHOUT this annotation:**
- OData service will NOT support aggregation
- Visual filter will fail to load
- Chart annotations will be ignored

**Placement:**
- ✅ **MUST be on PROJECTION view** (ZC_* or ZZZC_*) with `TRANSACTIONAL_QUERY` contract
- ❌ **NOT on interface view** (ZR_* or ZZZR_*)

**CORRECT Example:**
```abap
// MANDATORY! Must be present!
@OData.applySupportedForAggregation: #FULL
define root view entity ZC_ENTITY
  provider contract TRANSACTIONAL_QUERY
  as projection on ZR_ENTITY
{
  @Aggregation.default: #SUM  // Specify aggregation method for measure
  Amount;
  Category;  // Dimension field (no aggregation annotation needed)
}
```

**WRONG Example:**
```abap
// ❌ WRONG - Don't put on interface view
// WRONG PLACE!
@OData.applySupportedForAggregation: #FULL
define root view entity ZR_ENTITY
  as select from TABLE
```

### 2. Backend Metadata Extension (MANDATORY) - Add Chart, PresentationVariant, SelectionField Annotations

⚠️ **CRITICAL: `@UI.chart` and `@UI.presentationVariant` are ENTITY-LEVEL (header) annotations.**
Place them in the **header block — BEFORE `annotate view ZC_ENTITY with`** (alongside `@UI.headerInfo.*`), **NOT inside the `{ ... }` field block and NOT on a field** (e.g. the dimension field).
Attaching `@UI.chart` to a field fails activation with: `Annotation 'UI.chart.qualifier' used at wrong position (wrong scope)`.

```abap
// ↓↓↓ HEADER SCOPE: these go BEFORE `annotate view`, never on a field ↓↓↓
@UI.chart: [{
  qualifier: 'visualFilter',
  chartType: #BAR,
  dimensions: ['Category'],
  measures: ['Amount']
}]
@UI.presentationVariant: [{
  qualifier: 'visualFilter',
  visualizations: [{
    type: #AS_CHART,
    qualifier: 'visualFilter'
  }]
}]
annotate view ZC_ENTITY with
{
  @UI.selectionField: [{ position: 10 }]
  Category;

  @EndUserText.label: 'Amount'
  Amount;
}
```

### 3. Frontend (annotation.xml) - Add ValueList

**ValueList Annotation on Dimension Field:**
```xml
<Annotations Target="<YourServiceNamespace>.<YourEntityType>/Category">
  <Annotation Term="Common.ValueList" Qualifier="visualFilter">
    <Record Type="Common.ValueListType">
      <PropertyValue Property="CollectionPath" String="<YourEntitySet>"/>
      <PropertyValue Property="PresentationVariantQualifier" String="visualFilter"/>
      <PropertyValue Property="Parameters">
        <Collection>
          <Record Type="Common.ValueListParameterInOut">
            <PropertyValue Property="LocalDataProperty" PropertyPath="Category"/>
            <PropertyValue Property="ValueListProperty" String="Category"/>
          </Record>
        </Collection>
      </PropertyValue>
    </Record>
  </Annotation>
</Annotations>
```

**Important:** Replace placeholders:
- `<YourServiceNamespace>` - e.g., `com.sap.gateway.srvd.ztravel.v0001`
- `<YourEntityType>` - e.g., `TravelType`
- `<YourEntitySet>` - e.g., `Travel`

### 4. Verify Active Annotations (MANDATORY)

**After activating both DDLS and DDLX, verify the changes are live:**

⚠️ **IMPORTANT: DDLS and DDLX are Separate Objects**

The **projection view (DDLS file)** and **metadata extension (DDLX file)** are **separate ABAP development objects** that happen to share the same entity name.

**Key points:**
- **DDLS** = Data Definition (projection view) - contains entity definition, associations, fields, and data annotations
- **DDLX** = Metadata Extension - contains UI annotations (@UI.chart, @UI.presentationVariant, field labels, etc.)
- **Both must be activated individually** - activating one does NOT activate the other
- **Both must exist** for the visual filter to work

**Activation:**
- Use ABAP ADT MCP to activate ABAP objects
- Activate the **DDLS file** separately from the **DDLX file**

**Verification Steps:**

1. **Verify Activation Status:**
   - Check the activation tool output for success messages
   - Verify no errors were reported during activation
   - Both DDLS and DDLX must show successful activation

2. **Check OData $metadata:**
   - Open your service URL in browser: `<service-url>/$metadata`
   - Search for: `<Annotation Term="UI.Chart" Qualifier="visualFilter">`
   - Also verify: `<Annotation Term="UI.PresentationVariant" Qualifier="visualFilter">`
   - If these annotations are missing from $metadata, the DDLX is not active OR the service binding needs republishing

### 5. Manifest configuration (MANDATORY)
refer to the "Manifest Configuration" section below.

---

## Manifest Configuration (Common for CAP and RAP)

**Complete manifest.json structure:**

```json
"sap.ui5": {
  "routing": {
    "targets": {
      "<YourListReport>": {  // Replace with your actual List Report target name
        "type": "Component",
        "name": "sap.fe.templates.ListReport",
        "options": {
          "settings": {
            "contextPath": "/<YourEntitySet>",  // Replace with your entity set path
            "controlConfiguration": {
              "@com.sap.vocabularies.UI.v1.SelectionFields": {
                "layout": "CompactVisual",
                "initialLayout": "Visual",
                "filterFields": {
                  "Category": {
                    "visualFilter": {
                      "valueList": "com.sap.vocabularies.Common.v1.ValueList#visualFilter"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Path:** `sap.ui5.routing.targets.<ListReport>.options.settings.controlConfiguration`

**Important placeholders:**
- `<YourListReport>` - Your List Report target name (e.g., `TravelList`)
- `<YourEntitySet>` - Your entity set path (e.g., `/Travel`)
- `Category` - Your dimension field name
- `visualFilter` - Must match the qualifier in your annotations

---

## CRITICAL: Manifest Configuration Structure
**Visual filter settings go under `controlConfiguration`, NOT directly under `settings`!**

---

## Testing

Refer to the **Application Preview Guidelines** section in the `sap-fiori-app-development` skill for detailed testing instructions, including:
- CAP project testing with watch scripts
- Standalone Fiori project testing with live backend vs. mock mode
- Metadata refresh procedures after backend changes

---

## Key Differences

**CAP:**
- Aggregation + measures defined in CDS
- Uses DynamicMeasures
- Aggregation and chart defined in same place

**RAP:**
- Aggregation defined in backend CDS only
- Uses Measures (not DynamicMeasures)
- Metadata is read-only

---

## Common Mistakes
- Backend Changes are not activated.
- Qualifier mismatch between Chart, ValueList, PresentationVariant, and manifest
- Wrong path in manifest (use full vocabulary path)
- Missing SelectionField annotation
- Non-numeric measure field
- Missing compact visual layout configuration in manifest 

**RAP:**
- Missing backend aggregation support
- Using DynamicMeasures instead of Measures
- Adding Common.ValueList in backend instead of frontend (ValueList MUST be in frontend annotation.xml)
- Adding UI annotations directly in CDS projection view instead of metadata extension
- Trying to use @Consumption.valueHelpDefinition for visual filters (that's for value help dialogs, not visual filters)

---

## Best Practices

- Always activate backend changes in ADT MCP before testing
- Use 1 dimension + 1 measure per visual filter
- Prefer Bar charts for better readability
- Keep qualifier names consistent across all annotations
- Test with different data volumes
- Always include layout: "CompactVisual" and initialLayout: "Visual" in manifest

**RAP Specific:**
- ALWAYS use ADT MCP to modify backend files when available
- Chart + PresentationVariant → Backend metadata extension (.ddlx.acds)
- Common.ValueList → Frontend annotation.xml (CANNOT be in backend)

## References

- **ABAP RAP Aggregation support**: https://help.sap.com/docs/abap-cloud/abap-rap/projection-view
