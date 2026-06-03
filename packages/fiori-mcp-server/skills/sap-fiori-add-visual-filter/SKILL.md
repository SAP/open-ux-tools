---
name: sap-fiori-add-visual-filter
description: 'Add visual filters with charts to SAP Fiori Elements filter bar. Use when: adding interactive charts to filter fields, displaying aggregated data as visual filters, adding bar or line charts to filter bar, configuring visual filters with aggregation, implementing OData V4 visual filters in Fiori Elements applications.'
argument-hint: 'Filter field name, dimension field, measure field, chart type (Bar/Line)'
metadata:
  author: sap-fiori-tools
  version: "0.0.4"
---

# Add Visual Filter to SAP Fiori Elements Filter Bar

Add a visual filter with a chart to a filter field in SAP Fiori Elements applications. Visual filters display aggregated data as interactive charts to help users filter data visually.

## When to Use

- Add interactive visual charts directly to the filter bar
- Display aggregated metrics as visual filter fields
- Enable users to filter by viewing aggregated data in charts
- Enhance filter bar with visual analytics
- Show distribution or trends in filter options
- Implement analytics features in OData V4 filter bars

## Prerequisites

- Existing SAP Fiori Elements List Report application (OData V4)
- Backend service (CAP or ABAP RAP) with entity model
- Entity with numeric fields for aggregation
- Dimension field for grouping and filtering

## Backend Types

This skill supports two backend types. Choose the appropriate guide:

### Quick Reference: CAP vs RAP Key Differences

| Aspect | CAP Projects | RAP/ABAP Projects |
|--------|--------------|-------------------|
| **Chart Measures** | `DynamicMeasures` + DataPoint | `Measures` with direct PropertyPath |
| **Backend Aggregation** | `@Aggregation.ApplySupported` + `@Analytics.AggregatedProperty` | `@OData.applySupportedForAggregation` + `@Aggregation.default` |
| **Annotations Format** | CDS annotations | XML annotations |
| **Measure Definition** | DataPoint with aggregation logic | Direct property reference |

**⚠️ Using the wrong measure type causes:** `TypeError: Cannot read properties of undefined (reading 'map')`

### **[CAP Projects →](references/cap-implementation.md)**
CDS-based annotations using `@Aggregation.ApplySupported`, `@Analytics.AggregatedProperty`, and `DynamicMeasures`

### **[ABAP/RAP Projects →](references/rap-implementation.md)**
XML-based annotations using backend `@Aggregation.default` and frontend `Measures` property

## Procedure

**⚠️ IMPORTANT: Always configure backend aggregation support before adding frontend annotations.**

### High-Level Steps

1. **Gather Requirements**
   - **Backend type (CAP or ABAP/RAP)** ⚠️ CRITICAL: This determines chart configuration approach
   - Target entity name
   - Dimension field for grouping
   - Measure field to aggregate
   - Chart type (Bar or Line recommended)

2. **Configure Backend**
   - **[CAP: Configure aggregation support →](references/cap-implementation.md#backend-configuration)**
   - **[RAP: Configure backend CDS view →](references/rap-implementation.md#backend-configuration)**

3. **Add Frontend Annotations**
   - **[CAP: Add CDS annotations →](references/cap-implementation.md#frontend-annotations)**
   - **[RAP: Add XML annotations →](references/rap-implementation.md#frontend-annotations)**
   
   **⚠️ CRITICAL DIFFERENCE:**
   - **CAP**: Use `DynamicMeasures` with DataPoint annotations
   - **RAP**: Use `Measures` with direct property paths
   
   Core annotations needed:
   - Chart definition with dimensions and measures
   - Presentation variant linking to chart
   - ValueList on dimension field with PresentationVariantQualifier
   - Include field in SelectionFields

4. **Configure Manifest**
   - Add visual filter control configuration (common for both backend types)

5. **Test**
   - **[CAP: Testing guide →](references/cap-implementation.md#testing)**
   - **[RAP: Testing guide →](references/rap-implementation.md#testing)**

### Detailed Implementation

For step-by-step instructions with code examples:
- **[Complete CAP implementation guide →](references/cap-implementation.md)**
- **[Complete RAP implementation guide →](references/rap-implementation.md)**

## Manifest Configuration

Add visual filter configuration in `webapp/manifest.json` (same for both CAP and RAP):

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "EntityList": {
          "type": "Component",
          "id": "EntityList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "contextPath": "/YourEntity",
              "variantManagement": "Page",
              "initialLoad": true,
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                  "layout": "CompactVisual",
                  "initialLayout": "Visual",
                  "filterFields": {
                    "DimensionField": {
                      "availability": "Default",
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
}
```

**Key Configuration:**
- `layout: "CompactVisual"` - Enables both compact and visual filter modes with toggle
- `initialLayout: "Visual"` - Opens filter bar in visual mode by default
- `valueList` - Must include full vocabulary path with qualifier (e.g., `#visualFilter`)
- Field name in `filterFields` must match the entity property name exactly

## Testing & Verification

### Starting the Application

Refer to the **sap-fiori-elements** skill for guidance on how to start the application for CAP vs RAP/ABAP projects.

### Common Verification Steps

1. Start the application using the appropriate command
2. Filter bar displays in visual mode with chart
3. Chart shows aggregated data for the dimension field
4. Click chart elements to apply filters
5. Selected values appear in the filter field
6. Toggle between visual and compact modes works

**Backend-Specific Testing:**
- **[CAP Projects: Testing guide →](references/cap-implementation.md#testing)**
- **[RAP Projects: Testing guide →](references/rap-implementation.md#testing)**

## Chart Type Selection Guide

**⚠️ IMPORTANT: OData V4 visual filters work best with Bar and Line chart types.**

| ChartType | Best For | OData V4 Support |
|-----------|----------|------------------|
| `#Bar` | Horizontal bars, comparing categories | ✅ Recommended |
| `#Line` | Trends, sequential data | ✅ Supported |
| `#Column` | Vertical bars, comparing values | ❌ Not supported |
| `#Donut` | Part-to-whole relationships | ❌ Not supported |

**Recommendation:** Use **Bar** chart for visual filters (most common and reliable).

## Common Troubleshooting

**Visual filter chart not appearing:**
- Verify field is in `UI.SelectionFields`
- Check `PresentationVariantQualifier` matches between ValueList and PresentationVariant
- Verify manifest configuration has correct valueList path with qualifier
- Ensure `layout: "CompactVisual"` is set in manifest
- Confirm backend aggregation is configured

**Chart not displaying data:**
- Verify chart annotation references correct measure/dimension
- Check PresentationVariant references correct Chart annotation
- Ensure backend aggregation annotations exist

**Incorrect manifest configuration:**
- **Wrong:** `"valueList": "Common.ValueList#visualFilter"`
- **Correct:** `"valueList": "com.sap.vocabularies.Common.v1.ValueList#visualFilter"`
- Qualifier must match exactly (case-sensitive)

**TypeError: Cannot read properties of undefined (reading 'map'):**
- **Cause:** Using `DynamicMeasures` in a RAP/ABAP project (CAP-only feature)
- **Solution:** Replace with `Measures` property and direct PropertyPath references
- **Wrong (RAP):** `<PropertyValue Property="DynamicMeasures">` with DataPoint
- **Correct (RAP):** `<PropertyValue Property="Measures">` with PropertyPath
- See **[MISTAKE 4](#mistake-4-using-dynamicmeasures-in-rap-projects)** for detailed examples

**Backend-Specific Issues:**
- **[CAP troubleshooting →](references/cap-implementation.md#troubleshooting)**
- **[RAP troubleshooting →](references/rap-implementation.md#troubleshooting)**

## Common Mistakes to Avoid

### MISTAKE 1: Mismatched Qualifiers

**WRONG** ❌: Using different qualifiers across annotations

**CORRECT** ✅: Use same qualifier (e.g., `visualFilter`) for:
- Chart annotation
- PresentationVariant annotation
- ValueList annotation
- manifest.json valueList path

### MISTAKE 2: Wrong valueList Path

**WRONG** ❌: `"valueList": "Common.ValueList#visualFilter"`

**CORRECT** ✅: `"valueList": "com.sap.vocabularies.Common.v1.ValueList#visualFilter"`

### MISTAKE 3: Missing PresentationVariantQualifier

**WRONG** ❌: ValueList without `PresentationVariantQualifier`

**CORRECT** ✅: Include `PresentationVariantQualifier` property that references the PresentationVariant

### MISTAKE 4: Using DynamicMeasures in RAP Projects

**⚠️ CRITICAL:** This is a backend-specific difference that causes errors.

**WRONG** ❌ (for RAP/ABAP backends):
```xml
<PropertyValue Property="DynamicMeasures">
    <Collection>
        <AnnotationPath>@UI.DataPoint#Count</AnnotationPath>
    </Collection>
</PropertyValue>
```

**CORRECT** ✅ (for RAP/ABAP backends):
```xml
<PropertyValue Property="Measures">
    <Collection>
        <PropertyPath>TotalPrice</PropertyPath>
    </Collection>
</PropertyValue>
```

**Key Difference:**
- **CAP projects**: Use `DynamicMeasures` with `@Analytics.AggregatedProperty` and DataPoint annotations
- **RAP/ABAP projects**: Use `Measures` with direct property paths and backend `@Aggregation.default` annotations
- Using the wrong approach causes `TypeError: Cannot read properties of undefined (reading 'map')` at runtime

**Why this matters:**
- RAP backends define aggregation at the CDS level with `@Aggregation.default: #SUM` (or #AVG, #MIN, #MAX)
- These become `@Aggregation.CustomAggregate` annotations in metadata.xml
- Frontend charts reference the property directly via `Measures`, not through DataPoints
- CAP uses a different aggregation model with `AggregatableProperties` and dynamic measures

### Backend-Specific Troubleshooting:
- **[CAP troubleshooting →](references/cap-implementation.md#troubleshooting)**
- **[RAP troubleshooting →](references/rap-implementation.md#troubleshooting)**

## Best Practices

1. **Backend First:**
   - Always configure backend aggregation before frontend annotations
   - Verify aggregation support exists before adding visual filters

2. **Naming Consistency:**
   - Use consistent qualifier names across all annotations
   - Keep qualifiers synchronized between Chart, PresentationVariant, ValueList, and manifest

3. **Chart Selection:**
   - Use Bar charts for most visual filters (best user experience)
   - Choose dimensions with 5-30 distinct values for optimal visualization

4. **Testing Strategy:**
   - Refer to **sap-fiori-elements** skill for how to start CAP vs RAP/ABAP projects
   - Test with actual backend data when possible
   - Verify aggregations calculate correctly
   - Check filter synchronization between visual and compact modes

5. **Error Prevention:**
   - Match qualifiers exactly across all annotations (case-sensitive)
   - Always include `PresentationVariantQualifier` in ValueList
   - Use full vocabulary path in manifest valueList configuration

**For backend-specific best practices:**
- **[CAP best practices →](references/cap-implementation.md#best-practices)**
- **[RAP best practices →](references/rap-implementation.md#best-practices)**

## Reference Documentation

- [SAP UI5 Documentation - Visual Filters](https://ui5.sap.com/#/topic/1714720cae984ad8b9d9111937e7cd38)
- [OData Aggregation Vocabulary](http://docs.oasis-open.org/odata/odata-data-aggregation-ext/v4.0/odata-data-aggregation-ext-v4.0.html)
- **[Complete CAP Implementation Guide](references/cap-implementation.md)**
- **[Complete RAP Implementation Guide](references/rap-implementation.md)**
