 # Micro chart measures and dimensions must use a 1:n navigation entity path (`sap-micro-chart-requires-navigation-entity`)

Validates that `UI.Chart` annotations referenced from page-visible locations only reference properties through a 1:n navigation property. SAP Fiori Elements micro charts cannot display data from properties of the same entity — they require a collection of related records accessed via navigation. Using direct entity properties causes the micro chart to fail to render or show no data.

## Rule Details

The rule only checks charts that are actually displayed on a page. A chart is considered page-visible when it is referenced via a `UI.DataFieldForAnnotation` record in one of:

- A **List Report table** (`UI.LineItem` → `DataFieldForAnnotation.Target` → `@UI.Chart`)
- An **Object Page table section** (`UI.LineItem` → `DataFieldForAnnotation.Target` → `@UI.Chart`)
- An **Object Page header field group** (`UI.HeaderFacets` → `ReferenceFacet` → `UI.FieldGroup.Data` → `DataFieldForAnnotation.Target` → `@UI.Chart`)

`UI.Chart` annotations that are not referenced from any of these locations are ignored.

For every page-visible chart, every `PropertyPath` in the `Measures` and `Dimensions` collections must include a `/` navigation separator (e.g. `to_History/Revenue`). Each path that references a property of the chart's own entity (no `/`) is flagged individually — one warning per invalid `PropertyPath`, with the message identifying whether the violation is in a measure or a dimension.

**Cross-entity chart references (navigation annotation paths)**

When a `DataFieldForAnnotation.Target` references a chart via a navigation prefix (e.g. `to_Items/@UI.Chart`), the rule resolves the multiplicity of that navigation before deciding whether to check the chart:

- **1:n navigation** (e.g. `incidentFlow/@UI.Chart`): the chart entity is a collection row. Each row already represents a distinct data point, so direct scalar properties are valid measures/dimensions without any further navigation. The rule skips these charts.
- **To-one navigation** (e.g. `processingThreshold/@UI.Chart`): the chart entity is still a single-row context (same record as the page entity). Direct properties of that entity do not supply multiple data points, so the rule still runs and reports violations.
- **Unresolvable navigation**: when the multiplicity cannot be determined from the service metadata, the rule runs the check as a safe fallback.

**Warning (measure):** Micro chart measure must reference a property from a 1:n navigation entity (e.g. "to_History/Revenue" instead of "Revenue").

**Warning (dimension):** Micro chart dimension must reference a property from a 1:n navigation entity (e.g. "to_History/Period" instead of "Period").

The following patterns are considered warnings:

```xml
<!-- ⚠ WRONG: Chart is referenced from a table column and Measures use a direct property -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.Chart#MicroChart"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="MicroChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>TotalAmount</PropertyPath>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>to_Items/Month</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

```xml
<!-- ⚠ WRONG: Chart is referenced from a table column and Dimensions use a direct property -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.Chart#MicroChart"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="MicroChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>to_Items/MonthlyRevenue</PropertyPath>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>Month</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

```cds
// ⚠ WRONG: Chart referenced from a table column; Measures use a direct property (no navigation)
annotate service.SalesOrder with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#MicroChart'}],
    UI.Chart #MicroChart: {
        ChartType: #Line,
        Measures: [TotalAmount],
        Dimensions: [to_Items/Month]
    }
);
```

```cds
// ⚠ WRONG: Chart referenced from a table column; Dimensions use a direct property (no navigation)
annotate service.SalesOrder with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#MicroChart'}],
    UI.Chart #MicroChart: {
        ChartType: #Area,
        Measures: [to_Items/MonthlyRevenue],
        Dimensions: [Month]
    }
);
```

```xml
<!-- ⚠ WRONG: Chart referenced via a to-one navigation; its direct properties still need a 1:n hop -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="toShippingAddress/@UI.Chart#AddressChart"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
<Annotations Target="MyService.ShippingAddress">
    <Annotation Term="UI.Chart" Qualifier="AddressChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>Street</PropertyPath>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>City</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

The following patterns are not considered warnings:

```xml
<!-- ✅ CORRECT: Chart referenced from a table column; both Measures and Dimensions navigate via a 1:n association -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.Chart#RevenueTrend"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="RevenueTrend">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>to_Items/MonthlyRevenue</PropertyPath>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>to_Items/Month</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

```xml
<!-- ✅ CORRECT: Chart referenced from an Object Page header field group via UI.FieldGroup -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.HeaderFacets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="ChartHeader"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#ChartFG"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.FieldGroup" Qualifier="ChartFG">
        <Record>
            <PropertyValue Property="Data">
                <Collection>
                    <Record Type="UI.DataFieldForAnnotation">
                        <PropertyValue Property="Target" AnnotationPath="@UI.Chart#MicroChart"/>
                    </Record>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="MicroChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Column"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>to_Items/GrossAmount</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

```cds
// ✅ CORRECT: Both paths go through the to_Items 1:n navigation
annotate service.SalesOrder with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#ItemQuantities'}],
    UI.Chart #ItemQuantities: {
        ChartType: #Column,
        Measures: [to_Items/quantity],
        Dimensions: [to_Items/productID]
    }
);
```

```xml
<!-- ✅ CORRECT: Chart referenced via a 1:n navigation (to_Items); the chart entity is a
     collection row so its direct properties are valid measures/dimensions -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="to_Items/@UI.Chart#ItemChart"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
<Annotations Target="MyService.SalesOrderItem">
    <Annotation Term="UI.Chart" Qualifier="ItemChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bar"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>Quantity</PropertyPath>
                </Collection>
            </PropertyValue>
            <PropertyValue Property="Dimensions">
                <Collection>
                    <PropertyPath>ProductID</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

### How to Fix

1. Identify the entity that the `UI.Chart` annotation targets.
2. Add a 1:n association (composition or association to many) from that entity to a related collection entity.
3. Update the `Measures` and `Dimensions` `PropertyPath` values to reference properties through that navigation, e.g. `to_Items/Revenue` instead of `Revenue`.
4. Make sure the chart is referenced from a `UI.DataFieldForAnnotation` inside a `UI.LineItem` table or a `UI.FieldGroup` header facet — charts that are not wired into a page are not checked by this rule.

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Configuring Charts](https://ui5.sap.com/#/topic/653ed0f4f0d743dbb33ace4f68886c4e)
- [Adding a Micro Chart to a Table (OData V4)](https://ui5.sap.com/#/topic/b8312a4adde54f33a89480dbe12d8632)
- [Micro Chart Facet in the Object Page Header (OData V4)](https://ui5.sap.com/#/topic/e219fd0c85b842c69ac3a514e712ece5)
- [Adding a Micro Chart to a Table (OData V2)](https://ui5.sap.com/#/topic/6a52793ed9c248a8837b9d284711a402)
