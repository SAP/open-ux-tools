---
name: sap-fiori-add-visual-filter
description: Add visual filters (chart-based) to SAP Fiori Elements filter bar/value help using CAP or ABAP RAP.
argument-hint: field name (e.g., Category, Status)
metadata:
  author: sap-fiori-tools
  version: "0.0.4"
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

---

## ABAP RAP Implementation

- Aggregation.ApplySupported and Aggregation.CustomAggregate annotations must be available in metadata.xml (RAP). If not, below backend configuration is required.

### Backend CDS (MANDATORY)
```abap
@OData.applySupportedForAggregation: #FULL
define root view entity ZC_ENTITY
  provider contract analytical_query
  as projection on ZI_ENTITY
{
  key EntityID,

  @Aggregation.default: #SUM
  Amount,

  Category
}
```

### Chart Annotation
```xml
<Annotation Term="UI.Chart" Qualifier="visualFilter">
  <Record Type="UI.ChartDefinitionType">
    <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
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
❌ Metadata is **read-only**

### PresentationVariant Annotation
```xml
<Annotation Term="UI.PresentationVariant" Qualifier="visualFilter">
  <Record Type="UI.PresentationVariantType">
    <PropertyValue Property="Visualizations">
      <Collection>
        <AnnotationPath>@UI.Chart#visualFilter</AnnotationPath>
      </Collection>
    </PropertyValue>
  </Record>
</Annotation>
```

### ValueList Annotation
```xml
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
```

### SelectionFields Annotation
```xml
<Annotation Term="UI.SelectionFields">
  <Collection>
    <PropertyPath>Category</PropertyPath>
  </Collection>
</Annotation>
```

---

## Manifest Configuration (REQUIRED)
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

✅ Connects filter field to visual filter chart  
✅ Sets initial layout to visual mode

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

- **CAP**: DynamicMeasures + AggregatedProperty defined in CDS
- **RAP**: Measures + @Aggregation.default in backend CDS only
- **CAP**: Aggregation and chart defined in same place
- **RAP**: Metadata is read-only, must be configured in backend CDS.
- **Qualifier**: Must use same qualifier (#visualFilter) across Chart, ValueList, and manifest

---

## Common Mistakes

- Missing backend aggregation setup
- Qualifier mismatch between Chart, ValueList, PresentationVariant, and manifest
- Wrong path in manifest (use full vocabulary path)
- RAP projects using DynamicMeasures instead of Measures
- Forgetting PresentationVariantQualifier in ValueList
- Missing SelectionFields annotation

---

## Best Practices

- Use **Bar chart** (most common and recommended)
- Limit to 3–5 visual filters per filter bar
- Always configure backend aggregation first
- Use consistent qualifiers throughout
- Test with real data to verify aggregation works correctly
