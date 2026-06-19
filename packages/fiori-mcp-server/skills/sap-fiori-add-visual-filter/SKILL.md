---
name: sap-fiori-add-visual-filter
description: Add visual filters (chart-based) to SAP Fiori Elements filter bar/value help using CAP or ABAP RAP.
argument-hint: field name (e.g., Category, Status)
metadata:
  author: sap-fiori-tools
  version: "0.0.5"
---

# SAP Fiori Visual Filter

## Purpose
Add **chart-based filters (Bar/Line)** to filter bar or value help dialog (OData V4).

---

## MANDATORY: Gather Required Inputs First

**STOP and ASK the user for ALL of these inputs if ANY are missing from the prompt:**

1. **Entity** - Which entity to add the visual filter to
2. **Dimension field** - The field to filter by (e.g., Category, Status, Destination)
3. **Measure field** - The numeric field to aggregate (e.g., Amount, TotalPrice, ReservationPrice)
4. **Aggregation method** - How to aggregate: sum, avg, min, or max
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
  AggregationMethod: 'sum'
}
```

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

### 1. Backend CDS (MANDATORY) - Enable Aggregation Support
```abap
@OData.applySupportedForAggregation: #FULL
define root view entity ZC_ENTITY
  provider contract TRANSACTIONAL_QUERY
  as projection on ZR_ENTITY
{
  @Aggregation.default: #SUM
  Amount;
  Category;
}
```

### 2. Backend Metadata Extension (MANDATORY) - Add Chart, PresentationVariant, SelectionField Annotations
```abap
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

### 3. Frontend (annotation.xml)

**Chart Annotation:**
```xml
<Annotations Target="EntityType/Category">
<Annotation Term="Common.ValueList" Qualifier="visualFilter">
  <Record Type="Common.ValueListType">
    <PropertyValue Property="CollectionPath" String="EntityName"/>
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

### 4. Manifest configuration (MANDATORY)
refer to the "Manifest Configuration" section below.

---

## Manifest Configuration

```json
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
```
## CRITICAL: Manifest Configuration Structure
**NEVER nest visualFilter inside a `settings` property!**

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
