# ABAP RAP Implementation Guide - Analytical Charts

Detailed implementation guide for adding analytical charts to ABAP RESTful Application Programming (RAP) projects.

## Backend Configuration

ABAP RAP services require aggregation support to be enabled at the backend CDS view level. **Do NOT check or add `AggregatableProperties` to `@Aggregation.ApplySupported` for ABAP/RAP services.**

### Configure Backend CDS Projection View

The projection view (consumption view) must be configured with aggregation annotations.

**File:** Backend CDS Projection View (e.g., `ZC_TRAVEL_ANA` or `/DMO/C_TRAVEL_ANA`)

```abap
@Metadata.allowExtensions: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Travel Projection View for Analytics'
@OData.applySupportedForAggregation: #FULL

define root view entity ZC_TRAVEL_ANA
  provider contract transactional_query
  as projection on ZI_TRAVEL
{
  key TravelID,
      Destination,
      TravelStatus,
      
      @Aggregation.default: #SUM
      @EndUserText.label: 'Total Price (#SUM)'
      @Semantics.amount.currencyCode: 'CurrencyCode'
      TotalPrice,
      
      @Aggregation.default: #AVG
      @EndUserText.label: 'Average Booking Fee (#AVG)'
      @Semantics.amount.currencyCode: 'CurrencyCode'
      BookingFee,
      
      @Aggregation.default: #MIN
      @EndUserText.label: 'Min Price (#MIN)'
      @Semantics.amount.currencyCode: 'CurrencyCode'
      MinPrice,
      
      @Aggregation.default: #MAX
      @EndUserText.label: 'Max Price (#MAX)'
      @Semantics.amount.currencyCode: 'CurrencyCode'
      MaxPrice,
      
      @Aggregation.default: #COUNT_DISTINCT
      @EndUserText.label: 'Unique Destinations (#COUNT_DISTINCT)'
      @Aggregation.referenceElement: ['Destination']
      UniqueDestinations,
      
      CurrencyCode,
      Description,
      BeginDate,
      EndDate
}
```

**Key Annotations:**
- `@OData.applySupportedForAggregation: #FULL` - Enables analytical table features for OData V4 (MANDATORY in view header)
- `@Aggregation.default: #SUM` - Sum aggregation for the field
- `@Aggregation.default: #AVG` - Average aggregation for the field
- `@Aggregation.default: #MIN` - Minimum value aggregation
- `@Aggregation.default: #MAX` - Maximum value aggregation
- `@Aggregation.default: #COUNT_DISTINCT` - Count distinct values (requires `@Aggregation.referenceElement`)
- `@Aggregation.referenceElement: ['FieldName']` - Required with COUNT_DISTINCT to reference the field to count

**Important Backend Notes:**
- The projection view MUST use `provider contract transactional_query`
- Add `@Metadata.allowExtensions: true` to allow UI annotations
- Each measure field needs an `@Aggregation.default` annotation
- Fields without aggregation annotations are treated as dimensions (grouping fields)
- For COUNT_DISTINCT, the `@Aggregation.referenceElement` annotation is mandatory

## Verify Metadata Annotations

Before configuring frontend chart annotations, verify that the backend service has aggregation support configured.

**File to check:** `webapp/localService/mainService/metadata.xml` (or the path specified in manifest.json)

Look for these annotations in the EntityType definition:

```xml
<!-- Check for Aggregation.ApplySupported annotation -->
<Annotation Term="Org.OData.Aggregation.V1.ApplySupported">
    <Record>
        <!-- Backend aggregation support is configured -->
    </Record>
</Annotation>

<!-- Check for Aggregation.CustomAggregate annotations on properties -->
<Annotation Term="Org.OData.Aggregation.V1.CustomAggregate" Qualifier="TotalPrice" String="Edm.Decimal"/>
```

**Important:**
- These `@Aggregation.CustomAggregate` annotations are **read-only** and exposed by the backend service
- They are generated from `@Aggregation.default` annotations in the backend CDS projection view
- **Do NOT create or modify these annotations** in metadata.xml or annotation.xml
- The qualifier (e.g., `Qualifier="TotalPrice"`) matches an existing property of the entity
- This property will be referenced directly in the Chart's `Measures` (not `DynamicMeasures`)

### If Annotations Are Missing

❌ **If annotations DO NOT exist in metadata.xml** → Backend configuration is missing:

1. **Inform user**: "The backend CDS projection view needs to be configured with aggregation annotations first. Please add `@OData.applySupportedForAggregation: #FULL` and `@Aggregation.default` annotations to your backend CDS view."
2. **Ask user to configure backend** (refer to Backend Configuration section above)
3. **After backend is configured**, refresh the metadata:
   - Open command palette: `Cmd/Ctrl + Shift + P`
   - Search for and run: `Fiori: Open Service Manager`
   - In the Service Manager, click the **pencil icon** (✏️) next to the service URI
   - This will refresh and reload the metadata from the backend
4. **Verify metadata.xml** has been updated with the aggregation annotations
5. **Then proceed** with frontend chart annotation configuration

## Add Chart Annotation

For ABAP/RAP services, the chart references the aggregated property directly via `Measures` (not `DynamicMeasures`).

**File:** `webapp/annotations/annotation.xml`

```xml
<Annotations Target="com.sap.gateway.default.zui_travel_ana.v0001.TravelType">
    <Annotation Term="UI.Chart" Qualifier="TotalPriceByDestination">
        <Record Type="UI.ChartDefinitionType">
            <PropertyValue Property="Title" String="Total Price by Destination"/>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>Destination</PropertyPath>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>TotalPrice</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

**Important:**
- Use `Measures` property (not `DynamicMeasures`) to reference the aggregated property
- The property path must match the qualifier used in `@Aggregation.CustomAggregate`
- Multiple measures can be added by including multiple PropertyPath elements
- **Do NOT add `UI.PresentationVariant` annotation** when using the manifest `views` configuration
- **Only define the `UI.Chart` annotation** - the manifest will handle the view switching

## Testing

```bash
# Test with live backend (requires backend aggregation configuration)
npm start

# OR test with mock data (for local development/testing)
npm run start-mock
```

**Important:**
- Use `npm start` to test against the live backend service (backend must have aggregation annotations configured)
- Use `npm run start-mock` to test with local mock data (useful for frontend development before backend is ready)
- When using mock mode, ensure your local metadata.xml has the aggregation annotations for testing purposes

## Troubleshooting

**Chart not appearing:**
- **Check backend CDS projection view** has `@OData.applySupportedForAggregation: #FULL` in the header
- Verify measure fields have `@Aggregation.default` annotations (e.g., `#SUM`, `#AVG`, `#MIN`, `#MAX`)
- Verify `@Aggregation.CustomAggregate` qualifier matches an existing entity property
- Check `ContextDefiningProperties` includes the dimension fields
- Ensure the Chart's `Measures` property references the correct property path
- Confirm manifest.json has the correct `views` configuration

**Aggregation not working:**
- **Verify backend projection view** has `provider contract transactional_query`
- **Ensure measure fields** have the appropriate `@Aggregation.default` annotation in backend CDS view
- For COUNT_DISTINCT, verify `@Aggregation.referenceElement` is present in backend view
- Verify the qualifier in `@Aggregation.CustomAggregate` exactly matches an existing property name
- Do NOT add `AggregatableProperties` to `@Aggregation.ApplySupported` for RAP services
- Check that the backend RAP CDS view has aggregation support enabled
- Ensure dimension fields are included in `ContextDefiningProperties`

**Property not found:**
- The `@Aggregation.CustomAggregate` qualifier must match an existing entity property
- Use the exact property name as it appears in the entity type definition
- The same property name is then used in the Chart's `Measures` property
- **Do NOT manually add** `@Aggregation.CustomAggregate` annotations to metadata.xml or annotation.xml - they are backend-generated

**Metadata not reflecting backend changes:**
- Check `webapp/localService/mainService/metadata.xml` to verify if aggregation annotations are present
- If annotations are missing after backend configuration, refresh metadata:
  - Open command palette: `Cmd/Ctrl + Shift + P`
  - Search for and run: `Fiori: Open Service Manager`
  - In the Service Manager, click the **pencil icon** (✏️) next to the service URI to refresh metadata
- Clear browser cache and restart the application
- Verify the service URL in manifest.json points to the correct backend service
- Check if backend CDS view has been activated after making changes
- Remember: `@Aggregation.CustomAggregate` annotations in metadata.xml are read-only and generated by the backend
