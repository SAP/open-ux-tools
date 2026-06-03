# Visual Filter Implementation for ABAP RAP Projects

This guide provides detailed implementation steps for adding visual filters to SAP Fiori Elements applications with **ABAP RAP (RESTful Application Programming Model)** backends.

## Overview

ABAP RAP projects use:
- `@OData.applySupportedForAggregation: #FULL` in CDS view header
- `@Aggregation.default` annotations on measure fields in backend
- Backend-generated `@Aggregation.CustomAggregate` in metadata.xml (read-only)
- `Measures` in `@UI.Chart` (direct property paths, NOT DynamicMeasures)
- XML annotations in `webapp/annotations/annotation.xml`

## Important: Metadata.xml is Read-Only

**⚠️ CRITICAL:** Local `webapp/localService/mainService/metadata.xml` files are **READ-ONLY**. They reflect backend configuration and should **NEVER** be manually edited.

- Metadata is generated from the ABAP CDS backend
- Manual edits will be overwritten during refresh
- Always configure aggregation in backend CDS view first

## Backend Configuration

### Configure Aggregation in ABAP CDS View

Backend CDS projection view must be configured with aggregation annotations **in the ABAP system**:

```abap
@EndUserText.label: 'Travel projection view'
@Metadata.allowExtensions: true
@AccessControl.authorizationCheck: #NOT_REQUIRED

@OData.applySupportedForAggregation: #FULL
define root view entity ZC_TRAVEL_XXX
  provider contract transactional_query
  as projection on ZI_TRAVEL_XXX
{
  key TravelID,
      
      Description,
      Destination,
      Agency,
      Customer,
      TravelStatus,
      
      @Aggregation.default: #SUM
      TotalPrice,
      
      @Aggregation.default: #SUM
      ReservationPrice,
      
      @Aggregation.default: #AVG
      BookingFee,
      
      TotalPriceCurr,
      ReservationPriceCurr,
      
      StartDate,
      EndDate,
      
      LocalCreatedBy,
      LocalCreatedAt,
      LocalLastChangedBy,
      LocalLastChangedAt,
      LastChangedAt
}
```

**Key Requirements:**
- `@OData.applySupportedForAggregation: #FULL` in view header - **REQUIRED**
- `provider contract transactional_query` - **REQUIRED** for aggregation support
- `@Aggregation.default` on measure fields:
  - `#SUM`: Sum aggregation
  - `#AVG`: Average aggregation
  - `#MIN`: Minimum value
  - `#MAX`: Maximum value

**Important Notes:**
- Aggregation annotations must be in the backend CDS view
- The projection view (ZC_) typically contains these annotations
- Interface view (ZI_) may have additional aggregation configuration
- ABAP CDS does **not** support `AggregatableProperties` like CAP—use `@Aggregation.default` instead

### Verify Backend Metadata

After backend configuration, the OData metadata should contain aggregation annotations. Check your local metadata.xml for entries like:

```xml
<Annotation Term="Org.OData.Aggregation.V1.CustomAggregate" Qualifier="TotalPrice" String="Edm.Decimal"/>
<Annotation Term="Org.OData.Aggregation.V1.CustomAggregate" Qualifier="BookingFee" String="Edm.Decimal"/>
```

**If these annotations are missing:**
- Backend CDS view needs configuration
- Activate the CDS view in ABAP system
- Refresh local metadata (see Metadata Refresh section below)

## Metadata Refresh (Critical Step)

**⚠️ IMPORTANT:** Understanding when metadata refresh is required depends on your testing approach.

### For `npm start` (Live Backend):
- **No local metadata refresh needed** for runtime functionality
- Metadata is fetched directly from the live backend at runtime in the browser
- Backend changes are immediately available when you run the app
- Refresh local metadata **ONLY if you need** Application Modeler, Annotation LSP, or other tooling features to work

### For `npm run start-mock` (Mock Mode):
- **MUST refresh local metadata** for the app to work correctly
- Mock mode relies entirely on local `metadata.xml` file
- Without refresh, aggregation annotations won't be available locally
- Visual filter will fail if local metadata is outdated

### Steps to Refresh Metadata:

1. **Right-click** on `webapp/manifest.json`
2. Select **"Service Manager"**
3. Click the **pencil (edit) icon** next to your service
4. Choose your **Connection Type**:
   - **Destination** (SAP Business Application Studio)
   - **SAP System** (Visual Studio Code)
   - **Hostname** (direct server connection)
5. Provide credentials if required
6. Click either:
   - **"Refresh"** — updates local `metadata.xml` and annotation files
   - **"Refresh & Save"** — updates local files AND saves changes to `ui5*.yaml`

### What Gets Updated:
- `webapp/localService/<ServiceName>/metadata.xml` — ✅ Updated with latest backend metadata
- `webapp/localService/<ServiceName>/annotations/*.xml` — ✅ Updated backend annotations
- `ui5*.yaml` — ✅ Updated (only with "Refresh & Save")

### When to Refresh:
- **Required:** Before running `npm run start-mock` after backend changes
- **Optional:** For Application Modeler, Annotation LSP, or tooling support with `npm start`
- After adding `@OData.applySupportedForAggregation: #FULL` to backend CDS view
- After adding `@Aggregation.default` annotations to measure fields
- When you see errors in Application Modeler or Annotation LSP

## Frontend Annotations

All frontend annotations are defined in XML format in `webapp/annotations/annotation.xml`.

### Step 1: Verify Metadata Annotations

**Do NOT create these—they are backend-generated.** Only verify they exist in `webapp/localService/mainService/metadata.xml`:

```xml
<Annotations Target="SAP__self.TravelsType">
    <Annotation Term="Org.OData.Aggregation.V1.ApplySupported">
        <Record Type="Org.OData.Aggregation.V1.ApplySupportedType">
            <PropertyValue Property="Transformations">
                <Collection>
                    <String>aggregate</String>
                    <String>groupby</String>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>

<Annotations Target="SAP__self.TravelsType/TotalPrice">
    <Annotation Term="Org.OData.Aggregation.V1.CustomAggregate" Qualifier="TotalPrice" String="Edm.Decimal"/>
</Annotations>
```

If missing, configure backend and refresh metadata.

### Step 2: Add Visual Filter Chart

Add chart annotation to `webapp/annotations/annotation.xml`:

```xml
<Annotations Target="SAP__self.TravelsType">
    <!-- Existing annotations... -->
    
    <!-- Chart for visual filter -->
    <Annotation Term="UI.Chart" Qualifier="visualFilter">
        <Record Type="UI.ChartDefinitionType">
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

**Chart Configuration:**
- `ChartType`: Visualization type
  - `UI.ChartType/Bar`: Horizontal bar chart
  - `UI.ChartType/Column`: Vertical column chart
  - `UI.ChartType/Line`: Line chart
  - `UI.ChartType/Donut`: Donut/pie chart (OData V2 only, not for draft)
- `Dimensions`: Dimension fields for grouping (first dimension is used)
- `Measures`: Measure fields for aggregation (first measure is used)

**Important:**
- Use `Measures` with direct `PropertyPath` (NOT `DynamicMeasures` with AggregatedProperty)
- The measure field must have `@Aggregation.default` in backend CDS
- The dimension field must be a groupable field (string, date, etc.)

### Step 3: Add Presentation Variant

Link the chart to a presentation variant:

```xml
<Annotations Target="SAP__self.TravelsType">
    <!-- Presentation Variant -->
    <Annotation Term="UI.PresentationVariant" Qualifier="visualFilter">
        <Record Type="UI.PresentationVariantType">
            <PropertyValue Property="Visualizations">
                <Collection>
                    <AnnotationPath>@UI.Chart#visualFilter</AnnotationPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

**Configuration:**
- `Visualizations`: Array of chart references (first chart is used)
- Qualifier must match the Chart qualifier from Step 2

### Step 4: Add ValueList to Dimension Field

Link the visual filter to the dimension field:

```xml
<Annotations Target="SAP__self.TravelsType/Destination">
    <Annotation Term="Common.Label" String="Destination"/>
    <Annotation Term="Common.ValueList" Qualifier="visualFilter">
        <Record Type="Common.ValueListType">
            <PropertyValue Property="CollectionPath" String="Travels"/>
            <PropertyValue Property="Parameters">
                <Collection>
                    <Record Type="Common.ValueListParameterInOut">
                        <PropertyValue Property="LocalDataProperty" PropertyPath="Destination"/>
                        <PropertyValue Property="ValueListProperty" String="Destination"/>
                    </Record>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="PresentationVariantQualifier" String="visualFilter"/>
        </Record>
    </Annotation>
</Annotations>
```

**Key Elements:**
- `CollectionPath`: Entity name (e.g., "Travels", "Products")
- `LocalDataProperty`: Field in the current entity
- `ValueListProperty`: Field in the value help entity (usually the same)
- `PresentationVariantQualifier`: Must match the qualifier from Step 3

### Step 5: Ensure Field is in SelectionFields

Make sure the dimension field appears in the filter bar:

```xml
<Annotations Target="SAP__self.TravelsType">
    <Annotation Term="UI.SelectionFields">
        <Collection>
            <PropertyPath>Destination</PropertyPath>
            <PropertyPath>TravelStatus</PropertyPath>
            <PropertyPath>Agency</PropertyPath>
            <PropertyPath>Customer</PropertyPath>
        </Collection>
    </Annotation>
</Annotations>
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
              "contextPath": "/Travels",
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

### Test with Live Backend (Recommended)

```bash
npm start
```

**Advantages:**
- ✅ No metadata refresh needed
- ✅ Backend changes immediately available
- ✅ Real data from backend
- Requires active backend connection

### Test with Mock Data

```bash
npm run start-mock
```

**Requirements:**
- ⚠️ **MUST refresh metadata** after backend changes
- Uses local `metadata.xml` file
- Works offline
- Useful for local development

**Verify:**
- Open the application and view the filter bar
- Visual filter chart appears for the Destination field
- Chart displays aggregated TotalPrice grouped by Destination
- Clicking chart elements filters the data
- Filter values synchronize between visual and compact modes

## Complete Example

Here's a complete example for a Travels entity with visual filter on Destination:

**Backend CDS View (ABAP):**
```abap
@EndUserText.label: 'Travels Projection View'
@Metadata.allowExtensions: true
@AccessControl.authorizationCheck: #NOT_REQUIRED
@OData.applySupportedForAggregation: #FULL
define root view entity ZC_TRAVEL_XXX
  provider contract transactional_query
  as projection on ZI_TRAVEL_XXX
{
  key TravelID,
      Description,
      Destination,
      Agency,
      Customer,
      TravelStatus,
      
      @Aggregation.default: #SUM
      TotalPrice,
      
      TotalPriceCurr,
      StartDate,
      EndDate
}
```

**Frontend Annotations (webapp/annotations/annotation.xml):**
```xml
<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/Common.xml">
        <edmx:Include Namespace="com.sap.vocabularies.Common.v1" Alias="Common"/>
    </edmx:Reference>
    <edmx:Reference Uri="https://sap.github.io/odata-vocabularies/vocabularies/UI.xml">
        <edmx:Include Namespace="com.sap.vocabularies.UI.v1" Alias="UI"/>
    </edmx:Reference>
    <edmx:Reference Uri="/sap/opu/odata4/sap/your_service/srvd/sap/your_service/0001/$metadata">
        <edmx:Include Namespace="com.sap.gateway.srvd.your_service.v0001" Alias="SAP__self"/>
    </edmx:Reference>
    <edmx:DataServices>
        <Schema xmlns="http://docs.oasis-open.org/odata/ns/edm" Namespace="local">
            <Annotations Target="SAP__self.TravelsType">
                <!-- Selection Fields -->
                <Annotation Term="UI.SelectionFields">
                    <Collection>
                        <PropertyPath>Destination</PropertyPath>
                        <PropertyPath>TravelStatus</PropertyPath>
                        <PropertyPath>Agency</PropertyPath>
                    </Collection>
                </Annotation>
                
                <!-- Chart Definition -->
                <Annotation Term="UI.Chart" Qualifier="visualFilter">
                    <Record Type="UI.ChartDefinitionType">
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
                
                <!-- Presentation Variant -->
                <Annotation Term="UI.PresentationVariant" Qualifier="visualFilter">
                    <Record Type="UI.PresentationVariantType">
                        <PropertyValue Property="Visualizations">
                            <Collection>
                                <AnnotationPath>@UI.Chart#visualFilter</AnnotationPath>
                            </Collection>
                        </PropertyValue>
                    </Record>
                </Annotation>
            </Annotations>
            
            <!-- Field-level annotations -->
            <Annotations Target="SAP__self.TravelsType/Destination">
                <Annotation Term="Common.Label" String="Destination"/>
                <Annotation Term="Common.ValueList" Qualifier="visualFilter">
                    <Record Type="Common.ValueListType">
                        <PropertyValue Property="CollectionPath" String="Travels"/>
                        <PropertyValue Property="Parameters">
                            <Collection>
                                <Record Type="Common.ValueListParameterInOut">
                                    <PropertyValue Property="LocalDataProperty" PropertyPath="Destination"/>
                                    <PropertyValue Property="ValueListProperty" String="Destination"/>
                                </Record>
                            </Collection>
                        </PropertyValue>
                        <PropertyValue Property="PresentationVariantQualifier" String="visualFilter"/>
                    </Record>
                </Annotation>
            </Annotations>
        </Schema>
    </edmx:DataServices>
</edmx:Edmx>
```

## Troubleshooting

### Visual Filter Not Appearing

**Problem:** Visual filter chart doesn't show in the filter bar

**Solutions:**
- Check `webapp/localService/mainService/metadata.xml` for `Org.OData.Aggregation.V1.CustomAggregate` annotations
- If missing, configure backend CDS view and refresh metadata
- Verify `@OData.applySupportedForAggregation: #FULL` is in backend CDS view
- Verify TotalPrice has `@Aggregation.default: #SUM` in backend
- Ensure `PresentationVariantQualifier` matches between ValueList and PresentationVariant
- Check manifest has `layout: "CompactVisual"` and correct valueList path
- Verify Destination is in `UI.SelectionFields`

### Metadata Refresh Issues

**Problem:** Backend changes not reflected in app

**Solution for Mock Mode:**
1. Right-click `manifest.json` → "Service Manager"
2. Click pencil icon next to service → Choose connection
3. Click "Refresh & Save"
4. Verify `metadata.xml` now contains aggregation annotations
5. Then run `npm run start-mock`

**Solution for Live Backend:**
- No refresh needed—restart `npm start` if necessary
- Metadata is fetched at runtime from backend

### Chart Not Displaying

**Problem:** Filter bar loads but chart is not visible

**Solutions:**
- Verify `Measures` uses direct `PropertyPath` (not `DynamicMeasures`)
- Verify `UI.Chart` annotation format is correct
- Check `UI.PresentationVariant` references correct Chart annotation
- Verify backend metadata contains `CustomAggregate` for TotalPrice
- Check browser console for errors

### Aggregation Not Working

**Problem:** Chart shows but aggregation is incorrect or returns no data

**Solutions:**
- Verify `@Aggregation.default: #SUM` is on TotalPrice in backend CDS
- Activate the CDS view in ABAP system after changes
- Refresh local metadata
- Check TotalPrice is numeric type (Edm.Decimal, Edm.Int32, etc.)
- Verify `provider contract transactional_query` is in CDS view header
- Test aggregation with OData query: `$apply=groupby((Destination),aggregate(TotalPrice with sum as TotalPrice_sum))`

### Draft-Enabled Entity Issues

**Problem:** Aggregations not working on draft-enabled entities

**Known Limitation:**
- ABAP CDS/SADL does **not support** aggregations on draft-enabled entities
- This is a platform limitation—$apply query not supported with draft/transactional entities

**Workaround:**
- Use a separate non-draft view for visual filters
- Create a custom entity without draft for aggregation purposes
- Consider using analytical queries instead of transactional queries for reporting

## Best Practices

1. **Backend First Approach:**
   - Always configure backend CDS view before frontend
   - Verify metadata.xml contains aggregation annotations
   - Test backend aggregation with OData queries before adding UI

2. **Metadata Management:**
   - Never manually edit metadata.xml—it's read-only
   - Always use Service Manager for refresh
   - For live backend testing, metadata refresh is optional

3. **Testing Strategy:**
   - Test with `npm start` (live backend) first
   - Use mock mode only after confirming backend is correct
   - Clear browser cache when testing changes

4. **Chart Selection:**
   - Bar charts work best for visual filters (easy to select)
   - Avoid Donut for draft-enabled entities (not supported)

5. **Dimension Selection:**
   - Choose fields with 5-30 distinct values
   - Text fields, statuses, categories work well
   - Avoid fields with too many unique values

6. **Error Prevention:**
   - Use `Measures` (not `DynamicMeasures`) in RAP projects
   - Match qualifiers exactly across all annotations
   - Use full vocabulary path in manifest: `com.sap.vocabularies.Common.v1.ValueList#visualFilter`

7. **Performance:**
   - Limit visual filters to 3-5 per filter bar
   - Use appropriate aggregation methods (#SUM for totals, #AVG for averages)
   - Consider data volume when choosing dimensions
