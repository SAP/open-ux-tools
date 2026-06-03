# Visual Filter Implementation for CAP Projects

This guide provides detailed implementation steps for adding visual filters to SAP Fiori Elements applications with **CAP (Cloud Application Programming Model)** backends.

## Overview

CAP projects use:
- `@Aggregation.ApplySupported` with `AggregatableProperties` and `GroupableProperties`
- `@Analytics.AggregatedProperty` for defining measure aggregations
- `DynamicMeasures` in `@UI.Chart` (references AggregatedProperty annotations)
- CDS annotations for all configuration

## Backend Configuration

### Configure Aggregation Support

Enable analytical capabilities on the service entity in your CDS service definition (`srv/service.cds`):

```cds
service TravelService {
  entity Travel as projection on db.Travel;
}

// Add aggregation support
annotate TravelService.Travel with @Aggregation.ApplySupported: {
  Transformations: ['aggregate', 'groupby'],
  AggregatableProperties: [
    { Property: TotalPrice },    // Numeric fields that can be aggregated
    { Property: BookingFee },
    { Property: ReservationPrice }
  ],
  GroupableProperties: [
    Destination,                 // Fields that can be grouped by
    TravelStatus,
    Agency,
    Customer,
    StartDate,
    EndDate
  ]
};
```

**Key Requirements:**
- `Transformations: ['aggregate', 'groupby']` - Required for aggregation
- `AggregatableProperties`: List all numeric fields (measures) that can be summed, averaged, etc.
- `GroupableProperties`: List all fields that can be used for grouping (dimensions)
- Both properties are required for visual filters to work correctly

**Important Notes:**
- The annotation must be applied directly to the entity, not the service block
- Use `annotate ServiceName.EntityName with @Aggregation.ApplySupported` after the service definition
- All properties listed must exist in the entity

## Frontend Annotations

All frontend annotations are defined in CDS format in your app's annotations file (`app/yourapp/annotations.cds`).

### Step 1: Define Aggregated Property

Create an aggregated property annotation for each measure you want to display in the visual filter:

```cds
using TravelService as service from '../../srv/service';

annotate service.Travel @(
    // Define the aggregated property for sum
    Analytics.AggregatedProperty #TotalPrice_sum: {
        $Type: 'Analytics.AggregatedPropertyType',
        Name: 'TotalPrice_sum',
        AggregatableProperty: TotalPrice,
        AggregationMethod: 'sum',
        @Common.Label: 'Total Price'
    },
    
    // Define aggregated property for average
    Analytics.AggregatedProperty #BookingFee_average: {
        $Type: 'Analytics.AggregatedPropertyType',
        Name: 'BookingFee_average',
        AggregatableProperty: BookingFee,
        AggregationMethod: 'average',
        @Common.Label: 'Average Booking Fee'
    }
);
```

**Aggregation Methods:**
- `'sum'`: Total sum of values
- `'average'`: Average value
- `'min'`: Minimum value
- `'max'`: Maximum value

**Naming Convention:**
- Use descriptive names: `{PropertyName}_{AggregationMethod}`
- Example: `TotalPrice_sum`, `Amount_average`, `Quantity_min`

### Step 2: Add Chart Annotation

Define the chart that will be displayed in the filter bar as a visual filter:

```cds
annotate service.Travel @(
    UI.Chart #visualFilter: {
        $Type: 'UI.ChartDefinitionType',
        ChartType: #Bar,
        Dimensions: [Destination],
        DynamicMeasures: ['@Analytics.AggregatedProperty#TotalPrice_sum']
    }
);
```

**Chart Configuration:**
- `ChartType`: Chart visualization type
  - `#Bar`: Horizontal bar chart
  - `#Column`: Vertical column chart
  - `#Line`: Line chart
  - `#Donut`: Donut/pie chart
- `Dimensions`: Array of dimension fields for grouping (first dimension is used)
- `DynamicMeasures`: Array of references to AggregatedProperty annotations (first measure is used)

**Important:**
- Use `DynamicMeasures` (not `Measures`) for CAP projects
- Reference format: `'@Analytics.AggregatedProperty#QualifierName'`
- The qualifier must match the AggregatedProperty qualifier from Step 1

### Step 3: Add Presentation Variant

Link the chart to a presentation variant:

```cds
annotate service.Travel @(
    UI.PresentationVariant #visualFilter: {
        $Type: 'UI.PresentationVariantType',
        Visualizations: ['@UI.Chart#visualFilter'],
        SortOrder: [
            {
                $Type: 'Common.SortOrderType',
                Property: TotalPrice,
                Descending: true
            }
        ]
    }
);
```

**Configuration:**
- `Visualizations`: Array of chart references (first chart is used for visual filter)
- `SortOrder`: Optional - controls sorting of visual filter data

### Step 4: Add ValueList to Dimension Field

Link the visual filter to the dimension field:

```cds
annotate service.Travel with {
    Destination @(
        Common.ValueList #visualFilter: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'Travel',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: Destination,
                    ValueListProperty: 'Destination'
                }
            ],
            PresentationVariantQualifier: 'visualFilter'
        }
    )
}
```

**Key Elements:**
- `CollectionPath`: Entity to query for value help data (typically the same entity)
- `Parameters`: Maps the local property to the value list property
  - Use `Common.ValueListParameterInOut` for bidirectional mapping
  - `LocalDataProperty`: Field in the current entity
  - `ValueListProperty`: Field in the value help entity
- `PresentationVariantQualifier`: Must match the qualifier from Step 3

### Step 5: Add Field to SelectionFields

Ensure the dimension field appears in the filter bar:

```cds
annotate service.Travel @(
    UI.SelectionFields: [
        Destination,
        TravelStatus,
        Agency,
        Customer,
        StartDate,
        EndDate
    ]
);
```

## Manifest Configuration

Configure the visual filter in `webapp/manifest.json`:

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "TravelsList": {
          "type": "Component",
          "id": "TravelsList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "contextPath": "/Travel",
              "variantManagement": "Page",
              "initialLoad": true,
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                  "layout": "CompactVisual",
                  "initialLayout": "Visual",
                  "filterFields": {
                    "Destination": {
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

**Configuration Options:**
- `layout`: `"Compact"` or `"CompactVisual"` (both compact and visual modes)
- `initialLayout`: `"Visual"` or `"Compact"` (default view on load)
- `availability`: `"Default"`, `"Adaptation"`, or `"Hidden"`
- `valueList`: Full vocabulary path with qualifier

## Testing

Start the application:

```bash
npm start
# or
cds watch
```

**Verify:**
- Open the application and view the filter bar
- Visual filter chart appears for the Destination field
- Chart displays aggregated TotalPrice grouped by Destination
- Clicking chart elements filters the data
- Filter values synchronize between visual and compact modes

## Complete Example

Here's a complete example for a Travel entity with visual filter on Destination:

**Service Definition (srv/service.cds):**
```cds
using { sap.capire.travels as db } from '../db/schema';

service TravelService {
  entity Travel as projection on db.Travel;
}

annotate TravelService.Travel with @Aggregation.ApplySupported: {
  Transformations: ['aggregate', 'groupby'],
  AggregatableProperties: [
    { Property: TotalPrice },
    { Property: BookingFee }
  ],
  GroupableProperties: [
    Destination,
    TravelStatus,
    Agency
  ]
};
```

**Annotations (app/travels/annotations.cds):**
```cds
using TravelService as service from '../../srv/service';

// Define aggregated property
annotate service.Travel @(
    Analytics.AggregatedProperty #TotalPrice_sum: {
        $Type: 'Analytics.AggregatedPropertyType',
        Name: 'TotalPrice_sum',
        AggregatableProperty: TotalPrice,
        AggregationMethod: 'sum',
        @Common.Label: 'Total Price'
    }
);

// Define chart
annotate service.Travel @(
    UI.Chart #visualFilter: {
        $Type: 'UI.ChartDefinitionType',
        ChartType: #Bar,
        Dimensions: [Destination],
        DynamicMeasures: ['@Analytics.AggregatedProperty#TotalPrice_sum']
    }
);

// Define presentation variant
annotate service.Travel @(
    UI.PresentationVariant #visualFilter: {
        $Type: 'UI.PresentationVariantType',
        Visualizations: ['@UI.Chart#visualFilter']
    }
);

// Add to selection fields
annotate service.Travel @(
    UI.SelectionFields: [
        Destination,
        TravelStatus,
        Agency
    ]
);

// Configure value list
annotate service.Travel with {
    Destination @(
        Common.ValueList #visualFilter: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'Travel',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: Destination,
                    ValueListProperty: 'Destination'
                }
            ],
            PresentationVariantQualifier: 'visualFilter'
        },
        Common.Label: 'Destination'
    )
}
```

## Troubleshooting

### Visual Filter Not Appearing

**Problem:** Visual filter chart doesn't show in the filter bar

**Solutions:**
- Verify `@Aggregation.ApplySupported` is correctly configured in service.cds
- Check that Destination is in `GroupableProperties`
- Check that TotalPrice is in `AggregatableProperties`
- Verify `PresentationVariantQualifier` matches between ValueList and PresentationVariant
- Ensure manifest has `layout: "CompactVisual"` and correct valueList path
- Check that Destination is in `UI.SelectionFields`

### Chart Not Displaying

**Problem:** Filter bar loads but no chart is visible

**Solutions:**
- Verify `Analytics.AggregatedProperty` is correctly defined
- Check `DynamicMeasures` references the correct AggregatedProperty qualifier
- Ensure `UI.Chart` annotation is correctly formatted
- Verify `UI.PresentationVariant` references the correct Chart annotation
- Check browser console for errors

### Aggregation Not Working

**Problem:** Chart shows but aggregation calculation is incorrect

**Solutions:**
- Verify `Transformations: ['aggregate', 'groupby']` is present
- Check `AggregationMethod` in `Analytics.AggregatedProperty` ('sum', 'average', 'min', 'max')
- Ensure the measure field (TotalPrice) is numeric in the database
- Check for null values in the measure field (they may affect aggregation)

### Qualifier Mismatch Errors

**Problem:** Errors about missing annotations or qualifiers not found

**Solutions:**
- Use consistent qualifier (e.g., `#visualFilter`) across all annotations:
  - `Analytics.AggregatedProperty #TotalPrice_sum`
  - `UI.Chart #visualFilter`
  - `UI.PresentationVariant #visualFilter`
  - `Common.ValueList #visualFilter`
  - manifest.json: `"valueList": "...#visualFilter"`
- Qualifiers are case-sensitive—ensure exact match
- Check for typos in qualifier names

### ValueList Path Issues

**Problem:** Manifest configuration not working

**Solutions:**
- Use full vocabulary path: `com.sap.vocabularies.Common.v1.ValueList#visualFilter`
- Do not omit namespace or version
- Ensure qualifier after `#` matches ValueList qualifier
- Field name in `filterFields` must match entity property name exactly

## Best Practices

1. **Naming Conventions:**
   - Use descriptive AggregatedProperty names: `{PropertyName}_{Method}`
   - Use consistent qualifiers: `#visualFilter` across all annotations

2. **Chart Selection:**
   - Bar charts work best for visual filters (easy to select)
   - Line charts are suitable for trends over time

3. **Dimension Selection:**
   - Choose fields with 5-30 distinct values
   - Too many values make charts cluttered
   - Too few values don't benefit from visualization

4. **Testing Workflow:**
   - Test with `cds watch` for live reload
   - Clear browser cache when testing annotation changes
   - Use browser DevTools Network tab to inspect OData calls

5. **Performance:**
   - Limit the number of visual filters on one filter bar (3-5 recommended)
   - Consider lazy loading for large datasets (enabled by default in V4)
