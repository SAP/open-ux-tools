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
UI.Chart #Chart: {
  ChartType: #Column,
  Dimensions: [Category],
  DynamicMeasures: ['@Analytics.AggregatedProperty#Amount_avg']
}
```

✅ Uses **DynamicMeasures**

---

## ABAP RAP Implementation

## 3-Step Implementation Approach

**Always follow this systematic 3-step process for ABAP RAP:**

1. **Backend CDS Configuration** - Enable aggregation support by adding `@OData.applySupportedForAggregation: #FULL` to the CDS view and `@Aggregation.default` to measure fields.
2. **Chart Annotations** - Add `@UI.chart` annotation in the metadata extension (preferred) or frontend annotation.xml with chart type, dimensions, and measures.
3. **Frontend Manifest** - Configure the `views` section in manifest.json to display the chart alongside the table in a hybrid view or as separate tabs.

---

## CRITICAL: Verify Service Connection First using ADT MCP.

**BEFORE making any changes, verify which CDS view is exposed by the service:**

1. Check the frontend `manifest.json` for the service URI (e.g., `/sap/opu/odata4/sap/zzui_travel_o4/...`)
2. If ADT MCP is available:
   - Search for the service definition by name (e.g., `ZZUI_TRAVEL_O4`)
   - Open the service definition `.srvd.acds` file
   - Identify the exposed CDS view (e.g., `expose ZZC_TRAVEL001 as Travel`)
   - Use THIS CDS view for modifications, not similarly named views
3. The service name in the URI must match the service definition being modified

⚠️ **Common Mistake:** Modifying a CDS view that is NOT exposed by the service your app uses!

## Annotation Placement Strategy (ABAP RAP)

- **Preferred:** Backend **Metadata Extension** (when ADT MCP is available)
  - Single source of truth
  - Reusable across apps
  - Properly transported
  - Type-safe
  
- **Fallback:** Frontend `annotation.xml` (when backend access is not available)
  - Verify `Aggregation.ApplySupported` exists in metadata.xml
  - If missing, backend CDS configuration is required

### Backend CDS (MANDATORY) - Aggregation Support
```abap
@OData.applySupportedForAggregation: #FULL
define root view entity ZC_ENTITY
  provider contract transactional_query
  as projection on ZI_ENTITY
{
  key EntityID,

  @Aggregation.default: #SUM  // or #AVG, #MIN, #MAX
  Amount,

  Category
}
```

### Chart Annotation
```xml
<Annotation Term="UI.Chart" Qualifier="AnalyticalChart">
  <Record Type="UI.ChartDefinitionType">
    <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Column"/>
    <PropertyValue Property="Dimensions">
      <Collection>
        <PropertyPath>Category</PropertyPath>
      </Collection>
    </PropertyValue>
    <PropertyValue Property="Measures">
      <Collection>
        <PropertyPath>Amount</PropertyPath>
      </Collection>
    </PropertyValue>
  </Record>
</Annotation>
```

✅ Uses **Measures (not DynamicMeasures)**  
### CRITICAL: NEVER EDIT metadata.xml - IT IS READ-ONLY!

---

## Manifest Configuration (Common)

### Approach 1: Hybrid View (Chart + Table Together)

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

✅ Shows **chart + table together in same view**  
✅ Simple configuration

### Approach 2: Multiple View Tabs with PresentationVariant

**Annotations (CDS for CAP):**
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

**Backend Metadata Extension (Recommended for RAP):**
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
  sortOrder: [{
    by: 'SomeDate',
    direction: #DESC
  }],
  visualizations: [{
    type: #AS_CHART,
    qualifier: 'AnalyticalChart'
  }]
},
{
  qualifier: 'TableView',
  text: 'Table View',
  sortOrder: [{
    by: 'SomeDate',
    direction: #DESC
  }],
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

**Annotations (fallback: XML for RAP):**
```xml
<Annotation Term="UI.Chart" Qualifier="AnalyticalChart">
  <Record Type="UI.ChartDefinitionType">
    <PropertyValue Property="Title" String="Chart Title"/>
    <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Column"/>
    <PropertyValue Property="Dimensions">
      <Collection>
        <PropertyPath>Category</PropertyPath>
      </Collection>
    </PropertyValue>
    <PropertyValue Property="Measures">
      <Collection>
        <PropertyPath>Amount</PropertyPath>
      </Collection>
    </PropertyValue>
    <PropertyValue Property="MeasureAttributes">
      <Collection>
        <Record Type="UI.ChartMeasureAttributeType">
          <PropertyValue Property="Measure" PropertyPath="Amount"/>
          <PropertyValue Property="Role" EnumMember="UI.ChartMeasureRoleType/Axis1"/>
        </Record>
      </Collection>
    </PropertyValue>
    <PropertyValue Property="DimensionAttributes">
      <Collection>
        <Record Type="UI.ChartDimensionAttributeType">
          <PropertyValue Property="Dimension" PropertyPath="Category"/>
          <PropertyValue Property="Role" EnumMember="UI.ChartDimensionRoleType/Category"/>
        </Record>
      </Collection>
    </PropertyValue>
  </Record>
</Annotation>

<Annotation Term="UI.PresentationVariant" Qualifier="ChartView">
  <Record Type="UI.PresentationVariantType">
    <PropertyValue Property="Text" String="Chart View"/>
    <PropertyValue Property="Visualizations">
      <Collection>
        <AnnotationPath>@UI.Chart#AnalyticalChart</AnnotationPath>
      </Collection>
    </PropertyValue>
  </Record>
</Annotation>

<Annotation Term="UI.PresentationVariant" Qualifier="TableView">
  <Record Type="UI.PresentationVariantType">
    <PropertyValue Property="Text" String="Table View"/>
    <PropertyValue Property="Visualizations">
      <Collection>
        <AnnotationPath>@UI.LineItem</AnnotationPath>
      </Collection>
    </PropertyValue>
  </Record>
</Annotation>
```

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

✅ Allows **switching between chart and table as separate view tabs**  
✅ Users can toggle between visualizations

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

## Key Differences

CAP:
- Aggregation + measures defined in CDS  
- Uses DynamicMeasures  

RAP:
- Aggregation defined in backend CDS only  
- Uses Measures  

---

## Common Mistakes 

Both CAP & RAP:
- Wrong manifest config  
- Mixing Approach 1 and Approach 2 configurations
- Non-numeric measure  
- Wrong qualifier 

RAP:
- Missing backend aggregation support 
- Adding UI annotations directly in CDS projection
- Annotating interface views instead of projection views
- Ignoring @Metadata.allowExtensions: true
- Mixing backend & frontend annotations unnecessarily

---

## Best Practices

Both CAP & RAP:
- Use 1 dimension + 1–2 measures  
- Prefer Column/Bar charts  
- **Approach 1**: Use "defaultPath": "both" for chart + table side-by-side in same view
- **Approach 2**: Use `PresentationVariant` for separate view tabs (chart or table)  

RAP:
- Always annotate projection view, not interface view
- Always prefer Metadata Extension over inline annotations
- Keep CDS clean (no UI logic inside core model)
- Backend first → Frontend fallback
- Backend available → Use Metadata Extension (.mdext)
- No backend access → Use local annotation(annotation.xml) in frontend.

## References

- **ABAP RAP Aggregation support**: https://help.sap.com/docs/abap-cloud/abap-rap/projection-view