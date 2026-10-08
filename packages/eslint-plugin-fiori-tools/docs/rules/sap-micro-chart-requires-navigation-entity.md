 # Micro Chart Measures and Dimensions Must Use a 1:N Navigation Entity Path (`sap-micro-chart-requires-navigation-entity`)

Validates that `UI.Chart` annotations of certain micro chart types, referenced from visible locations, only reference properties using a 1:n navigation property. Micro charts of this kind cannot display data from properties of the same entity in SAP Fiori elements applications. They require a collection of related records accessed via navigation. Using direct entity properties causes the micro chart to not be displayed or show no data.

## Rule Details

### Chart Types Checked

The rule only applies to micro chart types that visualise a series of data points and therefore need a 1:n navigation entity:

| Chart Type | Rule Applies |
|---|---|
| `Line` | ✅ checked |
| `Area` | ✅ checked |
| `Column` | ✅ checked |
| `StackedBar` | ✅ checked |
| `Comparison` | ✅ checked |
| `Bullet` | ❌ excluded (uses 1:1 navigation) |
| `Pie` (Harvey Ball) | ❌ excluded (uses 1:1 navigation) |
| `Donut` (Radial) | ❌ excluded (uses 1:1 navigation) |
| Any other / not set | ❌ skipped |

Charts without a `ChartType` property are skipped entirely.

### Page Visibility

The rule only checks charts that are actually displayed on a page. A chart is considered visible when it is referenced using a `UI.DataFieldForAnnotation` record in one of the following:

- A table in a list report page: `UI.LineItem` → `DataFieldForAnnotation.Target` → `@UI.Chart`
- A table section in an object page: `UI.LineItem` → `DataFieldForAnnotation.Target` → `@UI.Chart`
- A field in the header of an object page: `UI.HeaderFacets` → `ReferenceFacet` → `UI.FieldGroup.Data` → `DataFieldForAnnotation.Target` → `@UI.Chart`

`UI.Chart` annotations that are not referenced from any of these locations are ignored.

For every visible chart of a checked type, every `PropertyPath` in the `Measures` and `Dimensions` collections must include a `/` navigation separator, for example, `to_History/Revenue`. Each path that references a property of the chart's own entity (no `/`) is flagged individually. One warning per invalid `PropertyPath` is displayed, identifying whether the violation is in a measure or a dimension.

**Cross-entity chart references (navigation annotation paths)**

When a `DataFieldForAnnotation.Target` references a chart using a navigation prefix, for example, `to_Items/@UI.Chart`, the rule resolves the multiplicity of that navigation before deciding whether to check the chart:

- **1:n navigation**, for example `incidentFlow/@UI.Chart`: the chart entity is a collection row. Each row already represents a distinct data point, so direct scalar properties are valid measures or dimensions without any further navigation. The rule skips these charts.
- **To-one navigation**, for example `processingThreshold/@UI.Chart`: the chart entity is still a single-row context. Direct properties of that entity do not supply multiple data points, so the rule still runs and reports violations (for checked chart types only).
- **Unresolvable navigation**: when the multiplicity cannot be determined from the service metadata, the rule runs the check as a safe fallback.

**Warning (measure):** Micro chart measure must reference a property from a 1:n navigation entity, for example, "to_History/Revenue" instead of "Revenue".

**Warning (dimension):** Micro chart dimension must reference a property from a 1:n navigation entity, for example, "to_History/Period" instead of "Period".

The following patterns are considered warnings:

```xml
<!-- ⚠ WRONG: Line chart is referenced from a table column and measures use a direct property -->
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
<!-- ⚠ WRONG: Area chart is referenced from a table column and dimensions use a direct property -->
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
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Area"/>
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
// ⚠ WRONG: Column chart referenced from a table column and measures use a direct property (no navigation)
annotate service.SalesOrder with @(
    UI.LineItem: [{$Type: 'UI.DataFieldForAnnotation', Target: '@UI.Chart#MicroChart'}],
    UI.Chart #MicroChart: {
        ChartType: #Column,
        Measures: [TotalAmount],
        Dimensions: [to_Items/Month]
    }
);
```

```cds
// ⚠ WRONG: Area chart referenced from a table column and dimensions use a direct property (no navigation)
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
<!-- ⚠ WRONG: Line chart referenced via to-one navigation. Its direct properties still need a 1:n hop -->
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
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
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
<!-- ✅ CORRECT: Line chart referenced from a table column. Both measures and dimensions navigate using a 1:n association -->
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
<!-- ✅ CORRECT: Column chart referenced from a field group in the header of an object page -->
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
<!-- ✅ CORRECT: Chart referenced using a 1:n navigation (to_Items). The chart entity is a
     collection row so its direct properties are valid measures and dimensions -->
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
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Line"/>
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

```xml
<!-- ✅ CORRECT: Bullet chart uses 1:1 navigation, so is excluded from this rule -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.Chart#BulletChart"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="BulletChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Bullet"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>CreditExposure</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

```xml
<!-- ✅ CORRECT: Harvey Ball (Pie) chart uses 1:1 navigation, so is excluded from this rule -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.Chart#HarveyBall"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="HarveyBall">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Pie"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>CreditExposure</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

```xml
<!-- ✅ CORRECT: Radial (Donut) chart — uses 1:1 navigation, excluded from this rule -->
<Annotations Target="MyService.SalesOrder">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.Chart#RadialChart"/>
            </Record>
        </Collection>
    </Annotation>
    <Annotation Term="UI.Chart" Qualifier="RadialChart">
        <Record>
            <PropertyValue Property="ChartType" EnumMember="UI.ChartType/Donut"/>
            <PropertyValue Property="Measures">
                <Collection>
                    <PropertyPath>CreditExposure</PropertyPath>
                </Collection>
            </PropertyValue>
        </Record>
    </Annotation>
</Annotations>
```

### How to Fix

1. Check the `ChartType` of the `UI.Chart` annotation. If it is `Bullet`, `Pie` (Harvey Ball), or `Donut` (Radial), this rule does not apply.
2. For checked chart types (`Line`, `Area`, `Column`, `StackedBar`, `Comparison`): identify the entity that the `UI.Chart` annotation targets.
3. Add a 1:n association (composition or association to many) from that entity to a related collection entity.
4. Update the `Measures` and `Dimensions` `PropertyPath` values to reference properties through that navigation, for example `to_Items/Revenue` instead of `Revenue`.
5. Ensure that the chart is referenced from a `UI.DataFieldForAnnotation` inside a `UI.LineItem` table or a `UI.FieldGroup` header facet. Charts that are not wired into a page are not checked by this rule.

## Bug Report

If you detect an issue with the check, open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Configuring Charts](https://ui5.sap.com/#/topic/653ed0f4f0d743dbb33ace4f68886c4e)
- [Adding a Micro Chart to a Table (OData V4)](https://ui5.sap.com/#/topic/b8312a4adde54f33a89480dbe12d8632)
- [Micro Chart Facet in the Object Page Header (OData V4)](https://ui5.sap.com/#/topic/e219fd0c85b842c69ac3a514e712ece5)
- [Adding a Micro Chart to a Table (OData V2)](https://ui5.sap.com/#/topic/6a52793ed9c248a8837b9d284711a402)
