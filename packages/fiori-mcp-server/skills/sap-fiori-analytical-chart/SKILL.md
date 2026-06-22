---
name: sap-fiori-analytical-chart
description: Add analytical chart (chart + table hybrid) to SAP Fiori Elements List Report using aggregated data. Supports CAP and ABAP RAP (OData V4).
argument-hint: Entity, dimension, measure, aggregation
metadata:
  author: sap-fiori-tools
  version: "0.0.2"
---

# SAP Fiori Analytical Chart

## Purpose
Add **analytical chart + table (hybrid view)** to visualize aggregated data.

---

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

1. **Entity** - Which entity to add the analytical chart to
2. **Dimension field** - The field to group by (e.g., Category, Status, Destination)
3. **Measure field** - The numeric field to aggregate (e.g., Amount, TotalPrice, ReservationPrice)
4. **Aggregation method** - How to aggregate: sum, avg, min, or max
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
  AggregatableProperty: Amount,
  AggregationMethod: 'average'
}
```

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

## ABAP RAP Implementation (2 Steps + Manifest Configuration)

### CRITICAL: NEVER EDIT metadata.xml - IT IS READ-ONLY!

### ⚠️ PRE-FLIGHT CHECKLIST - Verify BEFORE Implementation

**Missing ANY of these will cause the app to fail/not load:**

- [ ] `@OData.applySupportedForAggregation: #FULL` on **projection view** (ZC_*)
- [ ] `@Aggregation.default: #AVG` (or #SUM, #MIN, #MAX) on **measure field**
- [ ] `@UI.chart` annotation with correct **qualifier** in metadata extension
- [ ] Manifest `views.paths` configuration
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
---

## Manifest Configuration (Common)

### Approach 1: Hybrid View (Chart + Table Together)

**Manifest:**
```json
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
```

### Approach 2: Multiple View Tabs with PresentationVariant

**Manifest:**
```json
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
npm run start-mock # Needs metadata refresh

npm start          # No refresh needed - fetches metadata from live backend at runtime
```
- Consult fiori mcp server if available on how to refresh metadata for sap/cloud systems in case of RAP

---

## Implementation Order (RAP)

**Follow this sequence to avoid errors:**

1. **Modify Projection View (ZC_ENTITY)**
   - Add `@OData.applySupportedForAggregation: #FULL` at top
   - Add `@Aggregation.default: #AVG` to measure field
   - Activate projection view

2. **Modify Metadata Extension**
   - Add `@UI.chart` annotation
   - Add `@UI.presentationVariant` annotations
   - Activate metadata extension

3. **Update Fiori App Manifest**
   - Add `views.paths` configuration
   - Save manifest.json

4. **Test**
   - Run `npm start` (fetches live metadata - no republishing needed)
   - Service binding does NOT need to be republished

---

## Troubleshooting

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

- **ABAP RAP Aggregation support**: https://help.sap.com/docs/abap-cloud/abap-rap/projection-view