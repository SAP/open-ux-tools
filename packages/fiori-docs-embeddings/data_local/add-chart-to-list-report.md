# Add Chart to SAP Fiori List Report

## Skill ID
`add-chart-to-list-report`

## Goal
Add an analytical chart view to a SAP Fiori Elements List Report page to visualize aggregated data (average, sum, min, max) grouped by dimensions.

## Context
Analytical charts in List Reports help users understand patterns and trends through visual data representation. This skill enables chart capabilities with proper aggregation support for SAP Fiori Elements OData V4 applications.

## Prerequisites
- Existing SAP Fiori Elements List Report application (OData V4)
- CAP-based backend service with entity model
- Entity with numeric fields for aggregation
- Dimension field for grouping data

## Steps

### 1. Gather Requirements

Ask the user to clarify:
- Target entity name
- Dimension field for grouping (e.g., Destination, Category, Status)
- Measure field to aggregate (e.g., TotalPrice, Revenue, Quantity)
- Desired aggregation method (average, sum, min, max)
- Preferred chart type (Column, Bar, Line, Donut, etc.)

### 2. Configure Aggregation Support

Enable analytical capabilities on the service entity. This is REQUIRED for analytical charts.

**File:** `srv/service-name.cds`

```cds
service ServiceName @(path: '/service-path') {
  @Aggregation.ApplySupported: {
    Transformations: ['aggregate', 'groupby'],
    AggregatableProperties: [
      { Property: MeasureField }
    ],
    GroupableProperties: [
      DimensionField,
      OtherField1,
      OtherField2
    ]
  }
  entity EntityName as projection on db.EntityName;
}

annotate ServiceName.EntityName with @odata.draft.enabled;
```

**Important:**
- `Transformations` must include both 'aggregate' and 'groupby'
- List all numeric fields in `AggregatableProperties`
- List all fields that can be used for grouping in `GroupableProperties`

### 3. Define Aggregated Property

Create aggregated property for the measure using the desired aggregation method.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

```cds
annotate ServiceName.EntityName with @(
  Analytics.AggregatedProperty #MeasureField_average: {
    $Type: 'Analytics.AggregatedPropertyType',
    Name: 'MeasureField_average',
    AggregatableProperty: MeasureField,
    AggregationMethod: 'average',
    @Common.Label: 'Average Measure'
  }
);
```

**Aggregation Methods:**
- `'average'` - Calculate mean value
- `'sum'` - Calculate total
- `'min'` - Find minimum value
- `'max'` - Find maximum value
- `'countdistinct'` - Count unique values

### 4. Add Chart Annotation

Define the chart visualization with proper qualifier.

**File:** `app/app-name/annotations.cds` or `srv/service-name.cds`

```cds
annotate ServiceName.EntityName with @(
  UI.Chart #ChartByDimension: {
    $Type: 'UI.ChartDefinitionType',
    Title: 'Average Measure by Dimension',
    ChartType: #Column,
    Dimensions: [
      DimensionField
    ],
    DynamicMeasures: [
      '@Analytics.AggregatedProperty#MeasureField_average'
    ]
  }
);
```

**Chart Types:**
- `#Column` - Vertical bars (best for comparing categories)
- `#Bar` - Horizontal bars (good for long category names)
- `#Line` - Connected points (ideal for trends over time)
- `#Donut` - Ring chart (part-to-whole relationships)

### 5. Configure Manifest for Chart View

Add the chart view configuration to enable the analytical chart on the List Report.

**File:** `app/app-name/webapp/manifest.json`

```json
{
  "targets": {
    "EntityList": {
      "type": "Component",
      "id": "EntityList",
      "name": "sap.fe.templates.ListReport",
      "options": {
        "settings": {
          "contextPath": "/EntityName",
          "variantManagement": "Page",
          "views": {
            "paths": [
              {
                "primary": [
                  {
                    "annotationPath": "com.sap.vocabularies.UI.v1.Chart#ChartByDimension"
                  }
                ],
                "secondary": [
                  {
                    "annotationPath": "com.sap.vocabularies.UI.v1.LineItem"
                  }
                ],
                "defaultPath": "both"
              }
            ]
          }
        }
      }
    }
  }
}
```

**Configuration:**
- `primary` - Chart view (uses Chart annotation)
- `secondary` - Table view (uses LineItem annotation)
- `defaultPath` - Initial view: "both" (hybrid), "primary" (chart only), "secondary" (table only)

### 6. Test the Chart

Start the application and verify chart functionality.

```bash
cd project-folder
npm run watch-app-name
```

**Verify:**
- Chart displays in List Report with segmented buttons (Chart/Table/Both)
- Chart shows aggregated data grouped by dimension
- Table displays detail records
- Users can switch between Chart, Table, and Hybrid views
- Aggregations calculate correctly based on the data

## Chart Type Selection Guide

| Chart Type | Best For | Data Requirements |
|------------|----------|-------------------|
| `#Column` | Comparing categories, trends | 1 dimension, 1+ measures |
| `#Bar` | Long category names, rankings | 1 dimension, 1+ measures |
| `#Line` | Time series, continuous trends | 1 dimension (ideally time), 1+ measures |
| `#Donut` | Part-to-whole relationships | 1 dimension, 1 measure |
| `#Area` | Volume trends over time | 1 dimension (time), 1+ measures |
| `#Bubble` | Multi-dimensional comparison | 1 dimension, 2-3 measures |

## Multiple Measures Pattern

To add multiple aggregation options (average, sum, min, max):

```cds
annotate ServiceName.EntityName with @(
  Analytics.AggregatedProperty #MeasureField_average: {
    $Type: 'Analytics.AggregatedPropertyType',
    Name: 'MeasureField_average',
    AggregatableProperty: MeasureField,
    AggregationMethod: 'average',
    @Common.Label: 'Average Price'
  },
  Analytics.AggregatedProperty #MeasureField_sum: {
    $Type: 'Analytics.AggregatedPropertyType',
    Name: 'MeasureField_sum',
    AggregatableProperty: MeasureField,
    AggregationMethod: 'sum',
    @Common.Label: 'Total Price'
  }
);

annotate ServiceName.EntityName with @(
  UI.Chart #ChartByDimension: {
    $Type: 'UI.ChartDefinitionType',
    Title: 'Price Analysis by Dimension',
    ChartType: #Column,
    Dimensions: [
      DimensionField
    ],
    DynamicMeasures: [
      '@Analytics.AggregatedProperty#MeasureField_average',
      '@Analytics.AggregatedProperty#MeasureField_sum'
    ]
  }
);
```

Users can then switch between measures using a dropdown in the chart toolbar.

## Common Issues

**Chart not appearing:**
- Check `@Aggregation.ApplySupported` is properly configured on the service entity
- Verify dimension field has data values in CSV
- Ensure measure field is numeric (Decimal, Integer)
- Confirm manifest.json has the correct `views` configuration

**Measures not switching:**
- Verify DynamicMeasures array syntax is correct
- Check AggregatedProperty names match references exactly
- Use correct format: `@Analytics.AggregatedProperty#PropertyName_method`
- Ensure qualifier matches between definition and chart reference

**Aggregation errors:**
- Confirm GroupableProperties includes all dimension fields
- Verify AggregatableProperties includes all measure fields
- Check CSV data has proper values for grouping
- Ensure Transformations includes both 'aggregate' and 'groupby'

**Chart qualifier not found:**
- Verify annotationPath in manifest matches the chart qualifier exactly
- Format: `com.sap.vocabularies.UI.v1.Chart#QualifierName`
- Check annotation is defined in the service or app annotations file

## Example Use Cases

- **Sales Analysis**: Average revenue by region, total orders by product category
- **Inventory**: Min/max stock levels by warehouse, item counts by status
- **Travel**: Average trip cost by destination, total bookings by season
- **Finance**: Sum of expenses by department, average budget by quarter
- **Operations**: Max processing time by workflow, count of tasks by priority

## Notes

- Analytical charts require SAPUI5 version 1.106+ for full feature support
- Charts automatically handle currency and unit formatting
- Use `defaultPath: "both"` for best user experience (shows chart and table)
- Chart data is aggregated on the backend for better performance
- Users can personalize chart type and measures using variant management
- For time-based dimensions, consider using Date or DateTime types
- Multiple dimensions are supported but keep chart readable (max 2 dimensions recommended)
- Annotations can be defined in either `srv/service-name.cds` or `app/app-name/annotations.cds`