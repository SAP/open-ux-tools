---
name: sap-fiori-analytical-chart
description: Add analytical chart (chart + table hybrid) to SAP Fiori Elements List Report using aggregated data. Supports CAP and ABAP RAP (OData V4).
argument-hint: Entity, dimension, measure, aggregation
metadata:
  author: sap-fiori-tools
  version: "0.0.4"
---

# SAP Fiori Analytical Chart

## Purpose
Add **analytical chart + table (hybrid view)** to visualize aggregated data.

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

1. **Entity** - Which entity to add the analytical chart to
2. **Dimension field** - The field to group by (e.g., Category, Status, Destination)
3. **Measure field** - The numeric field to aggregate (e.g., Amount, TotalPrice, ReservationPrice)
4. **Aggregation method** - How to aggregate (see valid values below)
5. **Chart type** - Bar, Column, Line, Pie, HeatMap, Waterfall, HorizontalWaterfall
6. **Display mode** - How the chart should be shown:
   - **Separate tabs** (Approach 2)
   - **Hybrid view** (Approach 1)

**DO NOT proceed with implementation until all inputs are confirmed.**

---

## CAP Implementation

### Enable Aggregation
```cds
@Aggregation.ApplySupported: {
  Transformations: ['aggregate','groupby'],
  AggregatableProperties: [{Property: Amount}],
  GroupableProperties: [Category]
}
```

### Aggregated Property
```cds
Analytics.AggregatedProperty #Amount_avg: {
  Name: 'Amount_avg',
  AggregatableProperty: Amount,
  AggregationMethod: 'average',
  ![@Common.Label]: 'Average Amount'
}
```

**Valid `AggregationMethod` values (lowercase string):**
- `sum` - Sum of the non-null values
- `min` - Smallest of the non-null values
- `max` - Largest of the non-null values
- `average` - Sum of non-null values divided by count of non-null values
- `countdistinct` - Count of distinct values, omitting null values

⚠️ **CRITICAL:** Must be a **lowercase string** (e.g., `'sum'`), **NOT** an enum (e.g., `#SUM`). Using an enum will cause SQL generation errors.

### Chart
```cds
UI.Chart #AnalyticalChart: {
  $Type: 'UI.ChartDefinitionType',
  Title: 'Chart Title',
  ChartType: #Column,
  Dimensions: [Category],
  DynamicMeasures: ['@Analytics.AggregatedProperty#Amount_avg'],
  MeasureAttributes: [{
    $Type: 'UI.ChartMeasureAttributeType',
    DynamicMeasure: '@Analytics.AggregatedProperty#Amount_avg',
    Role: #Axis1
  }],
  DimensionAttributes: [{
    $Type: 'UI.ChartDimensionAttributeType',
    Dimension: Category,
    Role: #Category
  }]
},
UI.PresentationVariant #ChartView: {
  $Type: 'UI.PresentationVariantType',
  Text: 'Chart View',
  Visualizations: ['@UI.Chart#AnalyticalChart']
},
UI.PresentationVariant #TableView: {
  $Type: 'UI.PresentationVariantType',
  Text: 'Table View',
  Visualizations: ['@UI.LineItem']
}
```

✅ Uses **DynamicMeasures**

---

## ABAP RAP Implementation (3 Steps + Manifest Configuration)

### CRITICAL: NEVER EDIT metadata.xml - IT IS READ-ONLY!

### ⚠️ PRE-FLIGHT CHECKLIST - Verify BEFORE Implementation

**Missing ANY of these will cause the app to fail/not load:**

- [ ] `@OData.applySupportedForAggregation: #FULL` on **projection view** (ZC_*)
- [ ] `@Aggregation.default: #AVG` (or #SUM, #MIN, #MAX) on **measure field**
- [ ] `@UI.chart` annotation with correct **qualifier** in metadata extension
- [ ] Manifest `targets.<ListReport>.options.settings.views.paths` configuration
- [ ] All CDS objects **activated**

---

### 1. Backend Projection View (MANDATORY) - Enable Aggregation Support

⚠️ **CRITICAL: @OData.applySupportedForAggregation annotation is MANDATORY**

**WITHOUT this annotation:**
- OData service will NOT support aggregation
- App will FAIL TO LOAD (blank screen/errors)
- Chart annotations will be ignored

**Placement:**
- ✅ **MUST be on PROJECTION view** (ZC_* or ZZZC_*) with `TRANSACTIONAL_QUERY` contract
- ❌ **NOT on interface view** (ZR_* or ZZZR_*)

**CORRECT Example:**
```abap
@OData.applySupportedForAggregation: #FULL  ← MANDATORY! Must be present!
define root view entity ZC_ENTITY
  provider contract TRANSACTIONAL_QUERY
  as projection on ZR_ENTITY
{
  @Aggregation.default: #AVG  ← Specify aggregation method for measure
  Amount;
  Category;  ← Dimension field (no aggregation annotation needed)
}
```

**WRONG Example:**
```abap
// ❌ WRONG - Don't put on interface view
@OData.applySupportedForAggregation: #FULL  ← WRONG PLACE!
define root view entity ZR_ENTITY
  as select from TABLE
```

### 2. Backend Metadata Extension (MANDATORY) - Add Chart, PresentationVariant Annotations
```abap
@UI.chart: [{
  qualifier: 'AnalyticalChart',
  title: 'Chart Title',
  description: 'Chart description',
  chartType: #COLUMN,
  dimensions: ['Category'],
  measures: ['Amount'],
  dimensionAttributes: [{
    dimension: 'Category',
    role: #CATEGORY
  }],
  measureAttributes: [{
    measure: 'Amount',
    role: #AXIS_1
  }]
}]
@UI.presentationVariant: [{
  qualifier: 'ChartView',
  text: 'Chart View',
  visualizations: [{
    type: #AS_CHART,
    qualifier: 'AnalyticalChart'
  }]
},
{
  qualifier: 'TableView',
  text: 'Table View',
  visualizations: [{
    type: #AS_LINEITEM
  }]
}]
annotate view ZC_ENTITY with
{
  // Other field annotations...
  @EndUserText.label: 'Amount'
  Amount;
  
  @EndUserText.label: 'Category'
  Category;
}
```

### 3. Verify Active Annotations (MANDATORY)

**After activating both DDLS and DDLX, verify the changes are live:**

⚠️ **IMPORTANT: DDLS and DDLX are Separate Objects**

The **projection view (DDLS file)** and **metadata extension (DDLX file)** are **separate ABAP development objects** that happen to share the same entity name.

**Key points:**
- **DDLS** = Data Definition (projection view) - contains entity definition, associations, fields, and data annotations
- **DDLX** = Metadata Extension - contains UI annotations (@UI.chart, @UI.presentationVariant, field labels, etc.)
- **Both must be activated individually** - activating one does NOT activate the other
- **Both must exist** for the analytical chart to work

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
   - Search for: `<Annotation Term="UI.Chart" Qualifier="AnalyticalChart">`
   - Also verify: `<Annotation Term="UI.PresentationVariant" Qualifier="ChartView">`
   - If these annotations are missing from $metadata, the DDLX is not active OR the service binding needs republishing

---

## Manifest Configuration (Common for CAP and RAP)

### Approach 1: Hybrid View (Chart + Table Together)

**Manifest:**
```json
"targets": {
  "<ListReport>": {  // Replace with your actual List Report target name
    "type": "Component",
    "name": "sap.fe.templates.ListReport",
    "options": {
      "settings": {
        "contextPath": "/<YourEntity>",  // Replace with your entity set path
        "views": {
          "paths": [
            {
              "primary": [
                { "annotationPath": "com.sap.vocabularies.UI.v1.Chart#AnalyticalChart" }
              ],
              "secondary": [
                { "annotationPath": "com.sap.vocabularies.UI.v1.LineItem" }
              ],
              "defaultPath": "both"
            }
          ]
        }
      }
    }
  }
}
```

### Approach 2: Multiple View Tabs with PresentationVariant

**Manifest:**
```json
"targets": {
  "<ListReport>": {  // Replace with your actual List Report target name
    "type": "Component",
    "name": "sap.fe.templates.ListReport",
    "options": {
      "settings": {
        "contextPath": "/<YourEntity>",  // Replace with your entity set path
        "views": {
          "paths": [
            {
              "key": "ChartView",
              "annotationPath": "com.sap.vocabularies.UI.v1.PresentationVariant#ChartView"
            },
            {
              "key": "TableView",
              "annotationPath": "com.sap.vocabularies.UI.v1.PresentationVariant#TableView"
            }
          ]
        }
      }
    }
  }
}
```
---

## Testing

### CAP Projects
```bash
npm run watch-<app-name>  # e.g., npm run watch-manage-travel
# or use generic watch script if available
cds watch
```

### RAP Projects
```bash
npm run start-mock # Needs metadata refresh - see below

npm start          # No refresh needed - fetches metadata from live backend at runtime
```

**Refreshing metadata for `start-mock`:**
- When using `npm run start-mock`, the app uses locally cached `metadata.xml`
- After backend changes (DDLS/DDLX activation), refresh the local metadata
- For full details on testing and metadata refresh, consult the `sap-fiori-app-development` skill

---

## Implementation Order (RAP)

**Follow this sequence to avoid errors:**

1. **Modify Projection View (ZC_ENTITY) - DDLS file**
   - Add `@OData.applySupportedForAggregation: #FULL` at top
   - Add `@Aggregation.default: #AVG` to measure field
   - **Activate** using ABAP ADT MCP
   - Verify activation succeeded

2. **Modify Metadata Extension (ZC_ENTITY) - DDLX file**
   - Add `@UI.chart` annotation with qualifier
   - Add `@UI.presentationVariant` annotations
   - **Activate** using ABAP ADT MCP
   - Verify activation succeeded

3. **Verify Annotations are Active** (see Step 3 in ABAP RAP Implementation section above)

4. **Update Fiori App Manifest**
   - Add `views.paths` under `targets.<ListReport>.options.settings` (NOT inside `controlConfiguration`)
   - Save manifest.json

5. **Test**
   - Run `npm start` (fetches live metadata - no republishing needed)
   - Service binding does NOT need to be republished
   - If chart doesn't appear, check browser console for "Annotation Path ... not found" error

---

## Troubleshooting

### Symptom: Console error "Annotation Path for the primary visualization ... not found"

**Full error message:**
```
Annotation Path for the primary visualization com.sap.vocabularies.UI.v1.Chart#AnalyticalChart not found
```

**Cause:** The metadata extension (DDLX) is NOT active, so the `@UI.chart` annotation is not exposed in the OData $metadata.

**Solution:**
1. Activate the DDLX file using ABAP ADT MCP
2. Verify activation succeeded (check tool output for errors)
3. Verify the annotation appears in $metadata: `<service-url>/$metadata` (search for `Chart#AnalyticalChart`)
4. Restart the Fiori app: `npm start`

**Note:** Even if you edited the DDLX, it won't take effect until explicitly activated. The DDLS and DDLX are separate objects.

---

### Symptom: App doesn't load / Blank screen / Chart not visible

**Cause 1:** Missing `@OData.applySupportedForAggregation: #FULL`
- **Solution:** Add to projection view (ZC_*), activate, restart app

**Cause 2:** Annotation on wrong view
- **Solution:** Move from interface view (ZR_*) to projection view (ZC_*)

**Cause 3:** Measure field not numeric
- **Solution:** Verify field is numeric type (Amount, Quantity, Decimal, Integer)

**Cause 4:** Wrong qualifier in manifest
- **Solution:** Verify qualifier in manifest matches `@UI.chart: [{ qualifier: 'AnalyticalChart' }]`

**Cause 5:** Missing `@Aggregation.default` on measure
- **Solution:** Add `@Aggregation.default: #AVG` (or #SUM, #MIN, #MAX) to measure field

**Cause 6:** DDLX not activated (see console error above)
- **Solution:** Activate the metadata extension (DDLX) file using ABAP ADT MCP

### Symptom: Chart shows but with wrong data

**Cause:** Wrong aggregation method
- **Solution:** Change `@Aggregation.default` value (#AVG, #SUM, #MIN, #MAX)

---

## Key Differences

**CAP:**
- Aggregation + measures defined in CDS  
- Uses DynamicMeasures  

**RAP:**
- Aggregation defined in backend CDS only  
- Uses Measures  

---

## Common Mistakes 

**General:**
- Wrong manifest config  
- Mixing Approach 1 and Approach 2 configurations
- Non-numeric measure field
- Wrong qualifier (manifest doesn't match annotation)

**RAP-Specific:**
- ❌ **MOST COMMON:** Missing `@OData.applySupportedForAggregation: #FULL` → App won't load
- ❌ Placing aggregation annotation on interface view instead of projection view
- ❌ Missing `@Aggregation.default` on measure field
- ❌ Forgetting to activate CDS objects after changes
- ❌ Using wrong view contract (must be `TRANSACTIONAL_QUERY`)

---

## Best Practices
- Use 1 dimension + 1–2 measures  
- Prefer Column/Bar charts  
- **Approach 1**: Use "defaultPath": "both" for chart + table side-by-side in same view
- **Approach 2**: Use `PresentationVariant` for separate view tabs (chart or table)  

## References

- **SAP Fiori Elements Analytical List Report**: https://ui5.sap.com/test-resources/sap/fe/core/fpmExplorer/index.html#/topic/floorplanListReport/analyticalListReport
- **ABAP RAP Aggregation support**: https://help.sap.com/docs/abap-cloud/abap-rap/projection-view