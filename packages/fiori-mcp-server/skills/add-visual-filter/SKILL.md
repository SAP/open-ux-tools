---
name: add-visual-filter
description: 'Add visual filters with charts to SAP Fiori Elements value help dialogs. Use for: displaying aggregated data in filter fields, adding bar/column/line/donut charts to value help, configuring Analytics.AggregatedProperty with sum/average/min/max, setting up @Aggregation.ApplySupported, configuring manifest.json for visual filters, implementing OData V4 aggregation in CAP projects, enhancing List Report filter bars with visual analytics.'
argument-hint: 'field name to add visual filter to (e.g., "Category", "Status", "Region")'
---

# Add Visual Filter Bar to SAP Fiori Elements Application

## Purpose
This skill guides you through adding a visual filter to a value help dialog in SAP Fiori Elements applications. Visual filters display aggregated data as charts (bar, column, line, or donut) to help users filter data visually.

## When to Use This Skill
- Adding visual filters to value help dialogs on filter fields
- Enhancing user experience with graphical data representations
- Displaying aggregated data (sum, average, min, max) in filter selections
- Implementing analytics features in Fiori Elements OData V4 applications

## Prerequisites
- SAP CAP project with OData V4 service
- SAP Fiori Elements application (List Report or Analytical List Page)
- An entity with properties that can be aggregated
- Basic understanding of CDS annotations and manifest.json configuration

## Implementation Steps

### Step 1: Enable Aggregation Support in Service Definition
Add `@Aggregation.ApplySupported` annotation to the entity in your service file (e.g., `srv/service.cds`):

```cds
service YourService {
  @Aggregation.ApplySupported: {
    Transformations: ['aggregate', 'groupby'],
    AggregatableProperties: [
      { Property: MeasureField }  // e.g., Amount, Price, Quantity, Revenue
    ],
    GroupableProperties: [
      DimensionField1,  // e.g., Status, Category, Region, Department
      DimensionField2,
      // ... other fields that can be grouped
    ]
  }
  entity YourEntity as projection on schema.YourEntity;
}
```

**Key Points:**
- `AggregatableProperties`: Numeric fields that can be summed, averaged, etc. (measures)
- `GroupableProperties`: Fields to group by (dimensions)
- Both properties are required for visual filters to work

### Step 2: Define Aggregated Property in Annotations
In your annotations file (e.g., `app/your-app/annotations.cds`), define the aggregated property:

```cds
annotate service.YourEntity @(
    Analytics.AggregatedProperty #MeasureField_sum : {
        $Type : 'Analytics.AggregatedPropertyType',
        Name : 'MeasureField_sum',
        AggregatableProperty : MeasureField,
        AggregationMethod : 'sum',  // Options: sum, min, max, average
        @Common.Label : 'Total Amount'
    }
);
```

**Aggregation Methods:**
- `sum`: Total sum of values
- `min`: Minimum value
- `max`: Maximum value
- `average`: Average value

### Step 3: Create the Chart Definition
Define a chart that will be displayed in the value help dialog:

```cds
annotate service.YourEntity @(
    UI.Chart #visualFilter : {
        $Type : 'UI.ChartDefinitionType',
        ChartType : #Bar,  // Options: #Bar, #Column, #Line, #Donut
        Dimensions : [
            DimensionField  // Field to group by (e.g., Category, Status, Region)
        ],
        DynamicMeasures : [
            '@Analytics.AggregatedProperty#MeasureField_sum'
        ]
    }
);
```

**Chart Types:**
- `#Bar`: Horizontal bar chart
- `#Column`: Vertical column chart
- `#Line`: Line chart
- `#Donut`: Donut/pie chart

### Step 4: Create Presentation Variant
Link the chart to a presentation variant:

```cds
annotate service.YourEntity @(
    UI.PresentationVariant #visualFilter : {
        $Type : 'UI.PresentationVariantType',
        Visualizations : [
            '@UI.Chart#visualFilter'
        ]
    }
);
```

### Step 5: Configure Value List with Visual Filter
Add the field to SelectionFields and configure the value list:

```cds
annotate service.YourEntity with @(
    UI.SelectionFields : [
        DimensionField,
        // ... other filter fields
    ]
);

annotate service.YourEntity with {
    DimensionField @(
        Common.ValueList #visualFilter : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'YourEntity',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : DimensionField,
                    ValueListProperty : 'DimensionField',
                },
            ],
            PresentationVariantQualifier : 'visualFilter',
        },
        Common.Label : 'Field Label',
    )
}
```

**Key Elements:**
- `CollectionPath`: Entity to query for value help data
- `Parameters`: Maps the local property to the value list property
- `PresentationVariantQualifier`: Links to the presentation variant (must match the qualifier from Step 4)
- Field must be included in `UI.SelectionFields` to appear in the filter bar

### Step 6: Configure Visual Filter in Manifest.json
In your Fiori app's `webapp/manifest.json`, configure the visual filter display in the List Report settings:

```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "YourEntityList": {
          "type": "Component",
          "id": "YourEntityList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "contextPath": "/YourEntity",
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                  "filterFields": {
                    "DimensionField": {
                      "visualFilter": {
                        "valueList": "com.sap.vocabularies.Common.v1.ValueList#visualFilter"
                      }
                    }
                  },
                  "layout": "CompactVisual"
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

**Manifest Configuration Details:**
- `controlConfiguration`: Configure specific UI controls
- `@com.sap.vocabularies.UI.v1.SelectionFields`: Targets the filter bar
- `filterFields`: Object containing field-specific configurations
- `DimensionField`: The field name (must match the field in annotations)
- `visualFilter.valueList`: Full vocabulary path to the value list annotation (including the qualifier)
- `layout`: Set to `"CompactVisual"` to enable visual filter layout in the filter bar

**Important Notes:**
- The `valueList` path must match exactly: `com.sap.vocabularies.Common.v1.ValueList#visualFilter`
- The qualifier after `#` must match the qualifier used in the `@Common.ValueList` annotation
- Without this manifest configuration, the visual filter will not display even if annotations are correct

## Complete Example

Generic implementation template:

**Service Definition (srv/service.cds):**
```cds
service MyService {
  @Aggregation.ApplySupported: {
    Transformations: ['aggregate', 'groupby'],
    AggregatableProperties: [
      { Property: Amount }  // Your numeric/measure field
    ],
    GroupableProperties: [
      Category,      // Your dimension field
      Status,
      CreatedDate
      // Add other fields users can group by
    ]
  }
  entity Products as projection on db.Products;
}
```

**Annotations (app/yourapp/annotations.cds):**
```cds
// Step 2: Define aggregated property
annotate service.Products @(
    Analytics.AggregatedProperty #Amount_sum : {
        $Type : 'Analytics.AggregatedPropertyType',
        Name : 'Amount_sum',
        AggregatableProperty : Amount,
        AggregationMethod : 'sum',
        @Common.Label : 'Total Amount'
    }
);

// Step 3: Define chart
annotate service.Products @(
    UI.Chart #visualFilter : {
        $Type : 'UI.ChartDefinitionType',
        ChartType : #Bar,
        Dimensions : [
            Category
        ],
        DynamicMeasures : [
            '@Analytics.AggregatedProperty#Amount_sum'
        ]
    }
);

// Step 4: Create presentation variant
annotate service.Products @(
    UI.PresentationVariant #visualFilter : {
        $Type : 'UI.PresentationVariantType',
        Visualizations : [
            '@UI.Chart#visualFilter'
        ]
    }
);

// Step 5a: Add to selection fields
annotate service.Products @(
    UI.SelectionFields : [
        Category
    ]
);

// Step 5b: Configure value list
annotate service.Products with {
    Category @(
        Common.ValueList #visualFilter : {
            $Type : 'Common.ValueListType',
            CollectionPath : 'Products',
            Parameters : [
                {
                    $Type : 'Common.ValueListParameterInOut',
                    LocalDataProperty : Category,
                    ValueListProperty : 'Category',
                },
            ],
            PresentationVariantQualifier : 'visualFilter',
        },
        Common.Label : 'Product Category',
    )
};
```

**Manifest Configuration (app/yourapp/webapp/manifest.json):**
```json
{
  "sap.ui5": {
    "routing": {
      "targets": {
        "ProductsList": {
          "type": "Component",
          "id": "ProductsList",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "contextPath": "/Products",
              "variantManagement": "Page",
              "navigation": {
                "Products": {
                  "detail": {
                    "route": "ProductsObjectPage"
                  }
                }
              },
              "controlConfiguration": {
                "@com.sap.vocabularies.UI.v1.LineItem": {
                  "tableSettings": {
                    "type": "ResponsiveTable"
                  }
                },
                "@com.sap.vocabularies.UI.v1.SelectionFields": {
                  "filterFields": {
                    "Category": {
                      "visualFilter": {
                        "valueList": "com.sap.vocabularies.Common.v1.ValueList#visualFilter"
                      }
                    }
                  },
                  "layout": "CompactVisual"
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

## Testing the Visual Filter

1. Start the application: `cds watch`
2. Open the Fiori application in your browser
3. Click on the dimension field (e.g., Category) in the filter bar
4. The value help dialog should display a chart showing aggregated data
5. Click on a chart element (bar, column, etc.) to filter by that value
6. Verify the table updates to show only records matching your selection

## Common Issues and Troubleshooting

### Visual Filter Not Appearing
- Verify `@Aggregation.ApplySupported` is correctly configured in service.cds
- Ensure the dimension field is in `GroupableProperties`
- Ensure the measure field is in `AggregatableProperties`
- Check that `PresentationVariantQualifier` matches the qualifier in `UI.PresentationVariant`
- **Verify manifest.json has the visual filter configuration with correct valueList path**
- Ensure `layout: "CompactVisual"` is set in the manifest

### Chart Not Showing Data
- Verify there is data in the entity
- Check that the aggregated property name matches in both definition and usage
- Ensure the dimension field has multiple distinct values

### Field Not in Filter Bar
- Add the field to `UI.SelectionFields` annotation
- Clear browser cache and restart the application

### Visual Filter Configuration Not Applied
- Check that the field name in manifest.json matches exactly the field name in CDS
- Verify the valueList path includes the correct qualifier
- Ensure JSON syntax is valid (no trailing commas, proper nesting)
- Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

## Best Practices

1. **Choose Appropriate Chart Types:**
   - Bar/Column: Good for comparing categories
   - Line: Good for trends over time
   - Donut: Good for showing proportions

2. **Limit Dimensions:**
   - Use fields with a reasonable number of distinct values (5-20 items)
   - Too many values make the chart cluttered

3. **Naming Conventions:**
   - Use descriptive names for aggregated properties (e.g., `TotalPrice_sum`, `Amount_average`)
   - Use consistent qualifier names across related annotations (e.g., `#visualFilter`)
   - Keep qualifier names synchronized between annotations and manifest

4. **Performance:**
   - Visual filters trigger additional queries for aggregated data
   - Consider the performance impact on large datasets

5. **Manifest Configuration:**
   - Always use the full vocabulary path in manifest.json
   - Document the qualifier used to maintain consistency
   - Test after manifest changes by clearing cache

## Related Annotations

- `@Aggregation.ApplySupported`: Enables aggregation capabilities
- `@Analytics.AggregatedProperty`: Defines how to aggregate a measure
- `@UI.Chart`: Defines the chart visualization
- `@UI.PresentationVariant`: Groups visualization elements
- `@Common.ValueList`: Configures value help dialog
- `@UI.SelectionFields`: Adds fields to the filter bar
