---
name: sap-fiori-analytical-chart
description: 'Add analytical chart view to SAP Fiori Elements List Report for visualizing aggregated data. Use when: adding charts to List Reports, visualizing OData aggregations, implementing analytical views, configuring chart dimensions and measures, enabling chart/table hybrid views in Fiori Elements OData V4 applications.'
argument-hint: 'Entity name, dimension field, measure field, aggregation method'
metadata:
  author: sap-fiori-tools
  version: "0.0.1"
---

# Add Chart to SAP Fiori List Report

Add an analytical chart view to a SAP Fiori Elements List Report page to visualize aggregated data (average, sum, min, max) grouped by dimensions.

## When to Use

- Add visual data representation to List Reports
- Show aggregated metrics (average, sum, min, max)
- Enable chart/table hybrid views
- Analyze patterns and trends through charts
- Compare data across categories or time periods
- Implement analytical capabilities in OData V4 apps

## Prerequisites

- Existing SAP Fiori Elements List Report application (OData V4)
- Backend service (CAP or ABAP RAP) with entity model
- Entity with numeric fields for aggregation
- Dimension field for grouping data

## Backend Types

This skill supports two backend types with different annotation approaches:

### CAP Projects
- Uses `@Aggregation.ApplySupported` with `AggregatableProperties`
- Uses `@Analytics.AggregatedProperty` for defining aggregations
- References aggregations via `DynamicMeasures` in `@UI.Chart`
- **[See detailed CAP implementation guide →](references/cap-implementation.md)**

### ABAP/RAP Projects
- **Backend configuration required**: Must add `@OData.applySupportedForAggregation: #FULL` and `@Aggregation.default` annotations to backend CDS projection view
- Backend exposes `@Aggregation.CustomAggregate` annotations in metadata.xml - **do NOT create these, only verify they exist**
- **⚠️ IMPORTANT: Local metadata.xml files are READ-ONLY** - they reflect backend configuration and should never be manually edited
- Qualifier matches existing entity properties
- References via `Measures` property in `@UI.Chart`
- **Do NOT check for `AggregatableProperties` in `@Aggregation.ApplySupported`**
- **[See detailed RAP implementation guide →](references/rap-implementation.md)**

**🔄 Metadata Refresh for RAP Projects:**

After making backend CDS view changes, metadata refresh depends on your testing approach:
- **`npm start` (Live Backend):** No metadata refresh needed - metadata is fetched from backend at runtime in the browser
- **`npm run start-mock` (Mock Mode):** MUST refresh local metadata:
  1. Right-click `manifest.json` → "Service Manager"
  2. Click pencil icon → Choose connection → Click "Refresh & Save"
  3. Verify `metadata.xml` is updated with aggregation annotations
- **Tooling Support:** Refresh metadata if you need Application Modeler or Annotation LSP features to work (optional for `npm start`)

## Procedure

**⚠️ IMPORTANT: Always use the `primary`/`secondary` manifest configuration for chart/table views. Do NOT use `UI.PresentationVariant` - it does not reliably show both chart and table simultaneously. See "Critical Mistakes to Avoid" section for details.**

### 1. Gather Requirements

Ask the user to clarify:
- Backend type: CAP or ABAP/RAP
- Target entity name (e.g., Travel)
- Dimension field for grouping (e.g., Destination, TravelStatus, AgencyID)
- Measure field to aggregate (e.g., TotalPrice, BookingFee)
- Desired aggregation method (average, sum, min, max)
- Preferred chart type (Column, Bar, Line, Donut, etc.)

**For ABAP/RAP projects specifically:**
- Check `webapp/localService/mainService/metadata.xml` for existing `Aggregation.ApplySupported` and `Aggregation.CustomAggregate` annotations
- **⚠️ NOTE: metadata.xml is READ-ONLY** - it is generated from the backend service and should never be manually edited
- If annotations are missing:
  - Configure backend CDS view first with aggregation annotations
  - For `npm start`: Backend changes will be available immediately at runtime
  - For `npm run start-mock`: Must refresh local metadata via Service Manager before testing
- If annotations exist, proceed with frontend configuration

### 2. Configure Aggregation Support

Backend aggregation support must be configured before adding charts.

#### For CAP Projects

Enable analytical capabilities on the service entity with `@Aggregation.ApplySupported` annotation in your CDS service definition.

**[→ See detailed CAP implementation guide](references/cap-implementation.md#configure-aggregation-support)**

**Key requirements:**
- `Transformations: ['aggregate', 'groupby']`
- List all numeric fields in `AggregatableProperties`
- List all groupable fields in `GroupableProperties`

#### For ABAP/RAP Projects

Backend CDS projection view must be configured with aggregation annotations. This is **backend configuration** that must be done in the ABAP system.

**[→ See detailed RAP implementation guide](references/rap-implementation.md#backend-configuration)**

**Key requirements:**
- `@OData.applySupportedForAggregation: #FULL` in view header
- `@Aggregation.default` annotations on measure fields (#SUM, #AVG, #MIN, #MAX)
- `provider contract transactional_query`

**Important:** For RAP projects, check `webapp/localService/mainService/metadata.xml` for existing aggregation annotations before proceeding. If missing, backend must be configured first. **metadata.xml is read-only and reflects backend configuration - do not attempt to modify it manually.**

#### Refresh Metadata After Backend Changes (ABAP/RAP Only)

**⚠️ IMPORTANT: Understanding when metadata refresh is required depends on your testing approach:**

**For `npm start` (Live Backend):**
- **No local metadata refresh needed** for runtime functionality
- Metadata is fetched directly from the live backend at runtime in the browser
- Backend changes are immediately available when you run the app
- Refresh local metadata **ONLY if you need** Application Modeler, Annotation LSP, or other tooling features to work

**For `npm run start-mock` (Local Mock Data):**
- **MUST refresh local metadata** for the app to work correctly
- Mock mode relies entirely on local `metadata.xml` file
- Without refresh, aggregation annotations won't be available locally
- Chart will fail if local metadata is outdated

**Steps to refresh metadata:**

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

**What gets updated:**
- `webapp/localService/<ServiceName>/metadata.xml` — ✅ Updated with latest backend metadata
- `webapp/localService/<ServiceName>/annotations/*.xml` — ✅ Updated backend annotations
- `ui5*.yaml` — ✅ Updated (only with "Refresh & Save")

**When to refresh:**
- **Required:** Before running `npm run start-mock` after backend changes
- **Optional:** For Application Modeler, Annotation LSP, or tooling support with `npm start`
- After adding `@OData.applySupportedForAggregation: #FULL` to backend CDS view
- After adding `@Aggregation.default` annotations to measure fields
- When you see errors in Application Modeler or Annotation LSP

**Why local metadata matters:**
- **Mock mode** requires local metadata.xml as the data source
- **Development tools** (Application Modeler, Annotation LSP) use local metadata for validation and code completion
- **Live mode** (`npm start`) fetches metadata directly from backend at runtime, bypassing local files

### 3. Define Aggregated Properties

#### For CAP Projects

Create aggregated property annotations for measures in your CDS annotations file.

**[→ See detailed CAP implementation guide](references/cap-implementation.md#define-aggregated-property)**

Example:
```cds
Analytics.AggregatedProperty #TotalPrice_average: {
  AggregatableProperty: TotalPrice,
  AggregationMethod: 'average'
}
```

#### For ABAP/RAP Projects

Verify backend aggregation annotations exist in metadata.xml. **Do NOT create or modify these - they are backend-generated and the file is read-only.**

**[→ See detailed RAP implementation guide](references/rap-implementation.md#verify-metadata-annotations)**

Look for: `<Annotation Term="Org.OData.Aggregation.V1.CustomAggregate" ...>`

### 4. Add Chart Annotation

#### For CAP Projects

Define chart in CDS annotations using `DynamicMeasures`.

**[→ See detailed CAP implementation guide](references/cap-implementation.md#add-chart-annotation)**

Example:
```cds
UI.Chart #ChartQualifier: {
  ChartType: #Column,
  Dimensions: [Destination],
  DynamicMeasures: ['@Analytics.AggregatedProperty#TotalPrice_average']
}
```

#### For ABAP/RAP Projects

Define chart in `webapp/annotations/annotation.xml` using `Measures`.

**[→ See detailed RAP implementation guide](references/rap-implementation.md#add-chart-annotation)**

Example:
```xml
<Annotation Term="UI.Chart" Qualifier="ChartQualifier">
  <PropertyValue Property="Measures">
    <Collection><PropertyPath>TotalPrice</PropertyPath></Collection>
  </PropertyValue>
</Annotation>
```

### 5. Configure Manifest for Chart View

Add the chart view configuration to enable the analytical chart on the List Report.

**⚠️ CRITICAL: Use the `primary`/`secondary` structure shown below. This is the ONLY recommended approach for displaying chart and table together. Do NOT use `UI.PresentationVariant` - testing shows it does not reliably display both visualizations. See "Critical Mistakes to Avoid" section for details.**

**File:** `webapp/manifest.json`

```json
{
  "targets": {
    "TravelList": {
      "type": "Component",
      "id": "TravelList",
      "name": "sap.fe.templates.ListReport",
      "options": {
        "settings": {
          "contextPath": "/Travel",
          "variantManagement": "Page",
          "views": {
            "paths": [
              {
                "primary": [
                  {
                    "annotationPath": "com.sap.vocabularies.UI.v1.Chart#TotalPriceByDestination"
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

**Important Notes:**
- When using the `views` configuration in manifest.json, a `UI.PresentationVariant` annotation is **NOT required and should NOT be used**. The manifest configuration directly controls which visualizations appear.
- The annotation path can be specified with or without the `@` prefix: both `"@com.sap.vocabularies.UI.v1.Chart#Qualifier"` and `"com.sap.vocabularies.UI.v1.Chart#Qualifier"` are valid.
- **Do NOT add `UI.SelectionVariant` to the primary or secondary paths** unless you specifically need filter presets. SelectionVariant is for defining multiple views with different filter combinations, not for basic chart/table switching.
- The `primary` array should contain only the Chart annotation (not SelectionVariant).
- The `secondary` array should contain only the LineItem annotation (not both Chart and LineItem).
- **Why not PresentationVariant?** Real-world testing shows that using `UI.PresentationVariant` with `defaultTemplateAnnotationPath` or similar approaches does NOT reliably display both chart and table simultaneously - often only one visualization appears. Always use the `primary`/`secondary` structure instead.

### 6. Test the Chart

Start the application and verify chart functionality.

#### For CAP Projects

```bash
npm start
# or
npm run watch-travels
```

#### For ABAP/RAP Projects

```bash
# Test with live backend - metadata fetched at runtime
npm start

# OR test with mock data - requires local metadata refresh
npm run start-mock
```

**Important for ABAP/RAP Projects:**

**Live Backend (`npm start`):**
- ✅ Metadata is fetched directly from backend at runtime in the browser
- ✅ No local metadata refresh needed for the chart to work
- ✅ Backend changes are immediately available
- Backend must have aggregation annotations configured (`@OData.applySupportedForAggregation: #FULL` and `@Aggregation.default`)
- Requires active backend connection

**Mock Mode (`npm run start-mock`):**
- ⚠️ **MUST refresh local metadata** using Service Manager after backend changes
- Uses local `webapp/localService/mainService/metadata.xml` file
- Works offline without backend connection
- Useful for local development and testing

**Verify:**
- Chart displays in List Report with segmented buttons (Chart/Table/Both)
- Chart shows aggregated data grouped by dimension
- Table displays detail records
- Users can switch between Chart, Table, and Hybrid views
- Aggregations calculate correctly based on the data

**Troubleshooting:**
- **[CAP-specific issues →](references/cap-implementation.md#troubleshooting)**
- **[RAP-specific issues →](references/rap-implementation.md#troubleshooting)**

## Chart Type Selection Guide

| ChartType | Best For | Data Requirements |
|-----------|----------|-------------------|
| `#Column` | Comparing categories, trends | 1 dimension, 1+ measures |
| `#Bar` | Long category names, rankings | 1 dimension, 1+ measures |
| `#Line` | Time series, continuous trends | 1 dimension (ideally time), 1+ measures |
| `#Area` | Volume trends over time | 1 dimension (time), 1+ measures |
| `#Donut` | Part-to-whole relationships | 1 dimension, 1 measure |
| `#Pie` | Part-to-whole relationships | 1 dimension, 1 measure |
| `#Bubble` | Multi-dimensional comparison | 3 measures (x-axis, y-axis, size), 1-2 dimensions (optional for color/shape) |
| `#Scatter` | Data point distribution | 2 measures (x-axis, y-axis), up to 2 dimensions (optional) |

## Common Issues & Troubleshooting

For detailed troubleshooting guides:
- **[CAP Projects →](references/cap-implementation.md#troubleshooting)**
- **[RAP Projects →](references/rap-implementation.md#troubleshooting)**

**General Issues:**

**Backend aggregation annotations not visible in Fiori app (RAP only):**
- **Cause (Mock Mode):** Local metadata.xml is outdated and doesn't reflect recent backend changes
- **Solution for `npm run start-mock`:** 
  1. Right-click `manifest.json` → "Service Manager"
  2. Click pencil icon next to service → Choose connection type
  3. Click "Refresh & Save"
  4. Verify `metadata.xml` now contains `<Annotation Term="Org.OData.Aggregation.V1.CustomAggregate">` entries
- **Note for `npm start`:** Live backend mode fetches metadata at runtime from the backend, so local refresh is not required for the app to work (only for tooling support)

**Chart qualifier not found:**
- Verify annotationPath in manifest matches the chart qualifier exactly
- Format: `com.sap.vocabularies.UI.v1.Chart#QualifierName` or `@com.sap.vocabularies.UI.v1.Chart#QualifierName`
- Check annotation is defined in the service or app annotations file

**Incorrect manifest views configuration:**
- **Common mistake**: Adding `UI.SelectionVariant` to the `primary` array instead of the Chart annotation
- **Correct**: `primary` should contain ONLY the Chart annotation
- **Correct**: `secondary` should contain ONLY the LineItem annotation
- **Wrong**: Do NOT put both Chart and LineItem in the `secondary` array
- SelectionVariant is for filter presets/multiple views, not for basic chart/table switching

## Critical Mistakes to Avoid

### MISTAKE 1: Using Incorrect Manifest Views Structure

**WRONG** ❌:
```json
"views": {
  "paths": [
    {
      "key": "ChartView",
      "annotationPath": "com.sap.vocabularies.UI.v1.PresentationVariant#TotalPriceByDestination"
    },
    {
      "key": "TableView",
      "annotationPath": "com.sap.vocabularies.UI.v1.LineItem"
    }
  ]
}
```

**CORRECT** ✅:
```json
"views": {
  "paths": [
    {
      "primary": [
        {
          "annotationPath": "com.sap.vocabularies.UI.v1.Chart#TotalPriceByDestination"
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
```

**Why:** The correct structure uses `primary`/`secondary` arrays with `defaultPath`, not separate paths with `key`. The `key` approach is for a different views pattern and will not work for chart/table switching.

### MISTAKE 2: Using UI.PresentationVariant for Chart/Table Display

**WRONG** ❌:
```xml
<!-- In annotation.xml -->
<Annotation Term="UI.Chart" Qualifier="TotalPriceByDestination">
    <!-- Chart definition -->
</Annotation>
<Annotation Term="UI.PresentationVariant" Qualifier="TotalPriceByDestination">
    <Record Type="UI.PresentationVariantType">
        <PropertyValue Property="Visualizations">
            <Collection>
                <AnnotationPath>@UI.Chart#TotalPriceByDestination</AnnotationPath>
                <AnnotationPath>@UI.LineItem</AnnotationPath>
            </Collection>
        </PropertyValue>
    </Record>
</Annotation>
```

```json
// In manifest.json - WRONG approach
"defaultTemplateAnnotationPath": "com.sap.vocabularies.UI.v1.PresentationVariant#TotalPriceByDestination"
```

**CORRECT** ✅:
```xml
<!-- In annotation.xml -->
<Annotation Term="UI.Chart" Qualifier="TotalPriceByDestination">
    <!-- Chart definition -->
</Annotation>
<!-- No PresentationVariant needed! -->
```

```json
// In manifest.json - CORRECT approach
"views": {
  "paths": [
    {
      "primary": [
        {"annotationPath": "com.sap.vocabularies.UI.v1.Chart#TotalPriceByDestination"}
      ],
      "secondary": [
        {"annotationPath": "com.sap.vocabularies.UI.v1.LineItem"}
      ],
      "defaultPath": "both"
    }
  ]
}
```

**Why:** Real-world testing shows that using `UI.PresentationVariant` with manifest approaches like `defaultTemplateAnnotationPath` or `views.paths` with `key` does **NOT reliably display both chart and table simultaneously**. Often only one visualization appears, or the table doesn't render below the chart. The `primary`/`secondary` structure is the ONLY reliable way to display both visualizations together.

**When PresentationVariant IS needed:** Only use `UI.PresentationVariant` when you want to define multiple predefined views with different filters/sorting using `UI.SelectionVariant` (e.g., "Open Orders", "Closed Orders" as separate named views), NOT for basic chart/table switching.

### MISTAKE 3: Referencing PresentationVariant in Manifest Instead of Chart

**WRONG** ❌:
```json
"annotationPath": "com.sap.vocabularies.UI.v1.PresentationVariant#TotalPriceByDestination"
```

**CORRECT** ✅:
```json
"annotationPath": "com.sap.vocabularies.UI.v1.Chart#TotalPriceByDestination"
```

**Why:** The `primary` array should reference the `UI.Chart` annotation directly, not a `UI.PresentationVariant`. Only reference PresentationVariant when you're defining multiple named views with different filter combinations.

## Key Differences Between CAP and ABAP/RAP

| Aspect | CAP Projects | ABAP/RAP Projects |
|--------|--------------|-------------------|
| Aggregation Definition | `@Analytics.AggregatedProperty` in CDS/annotations | `@Aggregation.CustomAggregate` exposed in metadata.xml (backend-generated) |
| Frontend Action | Define aggregated properties in frontend annotations | Verify existing annotations in metadata, do NOT create |
| Property Reference | Creates new aggregated properties | Uses existing entity properties |
| Chart Measures | `DynamicMeasures` with `@Analytics.AggregatedProperty#qualifier` | `Measures` with direct `PropertyPath` |
| Qualifier Requirement | Any name (e.g., `PropertyName_average`) | Must match existing property name |
| ApplySupported | Requires `AggregatableProperties` | Do NOT use `AggregatableProperties` |
| File Type | `.cds` files | `.xml` annotation files |
| Metadata Refresh | Not required (local CDS automatically compiled) | **Required after ANY backend changes** - use Service Manager to refresh metadata.xml |

**For detailed implementation:**
- **[CAP Implementation Guide →](references/cap-implementation.md)**
- **[RAP Implementation Guide →](references/rap-implementation.md)**

## Notes

- Analytical charts require SAPUI5 version 1.106+ for full feature support
- Charts automatically handle currency and unit formatting
- Use `defaultPath: "both"` for best user experience (shows chart and table)
- Chart data is aggregated on the backend for better performance
- Users can personalize chart type and measures using variant management
- For time-based dimensions, consider using Date or DateTime types
- Multiple dimensions are supported but keep chart readable (max 2 dimensions recommended)
- **PresentationVariant**: Do NOT use `UI.PresentationVariant` for chart/table display - it does not reliably show both visualizations. Always use the `primary`/`secondary` manifest structure instead
- **RAP Projects Only**: After ANY backend CDS view changes, you MUST refresh metadata.xml using Service Manager (right-click manifest.json → Service Manager → Refresh). The local metadata.xml is read-only and won't automatically sync with backend changes.

## Example Use Cases (Travel Scenario)

- **Price Analysis**: Average total price by destination, sum of booking fees by travel status
- **Destination Insights**: Total travel bookings by destination, min/max prices by destination
- **Time-Based Analysis**: Total travel price by begin date (monthly/quarterly trends)
- **Status Distribution**: Count of travels by status, average price by status
- **Agency Performance**: Total bookings by agency, average price by agency

## References

### Implementation Guides
- **[CAP Implementation Guide](references/cap-implementation.md)** - Detailed instructions for CAP projects
- **[RAP Implementation Guide](references/rap-implementation.md)** - Detailed instructions for ABAP RAP projects
