# CAP Implementation Guide - Analytical Charts

Detailed implementation guide for adding analytical charts to SAP Cloud Application Programming Model (CAP) projects.

## Configure Aggregation Support

Enable analytical capabilities on the service entity. This is REQUIRED for analytical charts.

**File:** `srv/travel-service.cds`

```cds
service TravelService @(path: '/processor') {
  @Aggregation.ApplySupported: {
    Transformations: ['aggregate', 'groupby'],
    AggregatableProperties: [
      { Property: TotalPrice },
      { Property: BookingFee }
    ],
    GroupableProperties: [
      TravelID,
      Destination,
      TravelStatus,
      BeginDate,
      EndDate,
      CurrencyCode
    ]
  }
  entity Travel as projection on db.Travel;
}

annotate TravelService.Travel with @odata.draft.enabled;
```

**Important:**
- `Transformations` must include both 'aggregate' and 'groupby'
- List all numeric fields in `AggregatableProperties`
- List all fields that can be used for grouping in `GroupableProperties`

## Define Aggregated Property

Create aggregated property for the measure using the desired aggregation method.

**File:** `app/travels/annotations.cds` or `srv/travel-service.cds`

```cds
annotate TravelService.Travel with @(
  Analytics.AggregatedProperty #TotalPrice_average: {
    $Type: 'Analytics.AggregatedPropertyType',
    Name: 'TotalPrice_average',
    AggregatableProperty: TotalPrice,
    AggregationMethod: 'average',
    @Common.Label: 'Average Total Price'
  }
);
```

**Aggregation Methods:**
- `'average'` - Calculate mean value
- `'sum'` - Calculate total
- `'min'` - Find minimum value
- `'max'` - Find maximum value
- `'countdistinct'` - Count unique values

## Add Chart Annotation

Define the chart visualization with proper qualifier.

**File:** `app/travels/annotations.cds` or `srv/travel-service.cds`

```cds
annotate TravelService.Travel with @(
  UI.Chart #TotalPriceByDestination: {
    $Type: 'UI.ChartDefinitionType',
    Title: 'Average Total Price by Destination',
    ChartType: #Column,
    Dimensions: [
      Destination
    ],
    DynamicMeasures: [
      '@Analytics.AggregatedProperty#TotalPrice_average'
    ]
  }
);
```

**Chart Types:**
- `#Column` - Vertical bars (best for comparing categories)
- `#Bar` - Horizontal bars (good for long category names)
- `#Line` - Connected points (ideal for trends over time)
- `#Donut` - Ring chart (part-to-whole relationships)

## Multiple Measures Pattern

To add multiple aggregation options (average, sum, min, max):

```cds
annotate TravelService.Travel with @(
  Analytics.AggregatedProperty #TotalPrice_average: {
    $Type: 'Analytics.AggregatedPropertyType',
    Name: 'TotalPrice_average',
    AggregatableProperty: TotalPrice,
    AggregationMethod: 'average',
    @Common.Label: 'Average Price'
  },
  Analytics.AggregatedProperty #TotalPrice_sum: {
    $Type: 'Analytics.AggregatedPropertyType',
    Name: 'TotalPrice_sum',
    AggregatableProperty: TotalPrice,
    AggregationMethod: 'sum',
    @Common.Label: 'Total Price'
  }
);

annotate TravelService.Travel with @(
  UI.Chart #TotalPriceByDestination: {
    $Type: 'UI.ChartDefinitionType',
    Title: 'Travel Price Analysis by Destination',
    ChartType: #Column,
    Dimensions: [
      Destination
    ],
    DynamicMeasures: [
      '@Analytics.AggregatedProperty#TotalPrice_average',
      '@Analytics.AggregatedProperty#TotalPrice_sum'
    ]
  }
);
```

Users can then switch between measures using a dropdown in the chart toolbar.

## Testing

```bash
npm run watch-travels
# or
npm start
```

## Troubleshooting

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
