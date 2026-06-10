---
name: sap-fiori-analytical-chart
description: Add analytical chart (chart + table hybrid) to SAP Fiori Elements List Report using aggregated data. Supports CAP and ABAP RAP (OData V4).
argument-hint: Entity, dimension, measure, aggregation
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# SAP Fiori Analytical Chart

## Purpose
Add **analytical chart + table (hybrid view)** to visualize aggregated data.

---

## Inputs - ask if not provided in prompt
- Entity  
- Dimension (grouping field) 
- Measure (numeric field)
- Aggregation (sum, avg, min, max)

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

- Aggregation.ApplySupported and Aggregation.CustomAggregate annotations must be avilable in metadata.xml(RAP). If not, below backend configuration is required.

### Backend CDS (MANDATORY) - 
```abap
@OData.applySupportedForAggregation: #FULL
define root view entity ZC_ENTITY
  provider contract transactional_query {

  @Aggregation.default: #SUM
  Amount,

  Category
}
```

### Chart Annotation
```xml
<Annotation Term="UI.Chart" Qualifier="Chart">
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
❌ Metadata is **read-only**

---

## Manifest Configuration (Common)

```json
"views": {
  "paths": [
    {
      "primary": [
        { "annotationPath": "com.sap.vocabularies.UI.v1.Chart#Chart" }
      ],
      "secondary": [
        { "annotationPath": "com.sap.vocabularies.UI.v1.LineItem" }
      ],
      "defaultPath": "both"
    }
  ]
}
```

✅ Shows **chart + table together**  
❌ Do NOT use `PresentationVariant`

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
```
- Consult fiori mcp server if available on how to refresh metadata for backend systems in case of RAP

---

## Key Differences

- CAP: Aggregation + measures defined in CDS  
- RAP: Aggregation defined in backend CDS only  
- CAP: Uses DynamicMeasures  
- RAP: Uses Measures  
- RAP metadata: read-only  

---

## Common Mistakes

- Missing backend aggregation (RAP)  
- Wrong manifest config  
- Using PresentationVariant  
- Non-numeric measure  
- Wrong qualifier  

---

## Best Practices

- Use 1 dimension + 1–2 measures  
- Prefer Column/Bar charts  
- Use "defaultPath": "both" for hybrid view  
