 # Micro chart measures and dimensions must use a 1:n navigation entity path (`sap-micro-chart-requires-navigation-entity`)

Validates that `UI.Chart` annotations referenced from page-visible locations only reference properties through a 1:n navigation property. SAP Fiori Elements micro charts cannot display data from properties of the same entity — they require a collection of related records accessed via navigation. Using direct entity properties causes the micro chart to fail to render or show no data.

## Rule Details

The rule only checks charts that are actually displayed on a page. A chart is considered page-visible when it is referenced via a `UI.DataFieldForAnnotation` record in one of:

- A **List Report table** (`UI.LineItem` → `DataFieldForAnnotation.Target` → `@UI.Chart`)
- An **Object Page table section** (`UI.LineItem` → `DataFieldForAnnotation.Target` → `@UI.Chart`)
- An **Object Page header field group** (`UI.HeaderFacets` → `ReferenceFacet` → `UI.FieldGroup.Data` → `DataFieldForAnnotation.Target` → `@UI.Chart`)

`UI.Chart` annotations that are not referenced from any of these locations are ignored.

For every page-visible chart, every `PropertyPath` in the `Measures` and `Dimensions` collections must include a `/` navigation separator (e.g. `to_History/Revenue`). If any path references a property of the chart's own entity (no `/`), the entire `UI.Chart` annotation is flagged — one warning per chart regardless of how many invalid paths it contains.

**Warning:** Micro chart measures and dimensions must reference properties from a 1:n navigation entity (e.g. "to_History/Revenue" instead of "Revenue").

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
