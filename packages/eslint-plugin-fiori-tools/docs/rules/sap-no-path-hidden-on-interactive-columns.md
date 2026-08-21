# `UI.Hidden` with a dynamic path must not be used on sortable or filterable columns (`sap-no-path-hidden-on-interactive-columns`)

A `UI.Hidden` annotation that uses a path-based (dynamic) value on a `UI.LineItem` column can cause UX inconsistencies when that column is still sortable or filterable, because those operations are performed on the back end which is unaware of the dynamic hidden state. Use a static `UI.Hidden` (`Bool="true"`) or restrict sorting and filtering via `Capabilities.SortRestrictions` and `Capabilities.FilterRestrictions` annotations.

## Rule Details

The rule checks every `UI.DataField` record inside a `UI.LineItem` annotation. If the record carries a `UI.Hidden` annotation with a `Path` attribute (dynamic hiding), the rule reports a warning unless the column's property is explicitly listed in **both** `Capabilities.SortRestrictions/NonSortableProperties` and `Capabilities.FilterRestrictions/NonFilterableProperties`.

##### Warning Message: `UI.Hidden with a path-based value must not be used on a sortable or filterable column. Use a static UI.Hidden or restrict sorting and filtering via Capabilities annotations.`

The following patterns are considered warnings:

**XML:**

```xml
<!-- Dynamic UI.Hidden on a column with no Capabilities restrictions -->
<Annotations Target="SalesService.SalesOrders">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="OrderValue"/>
                <Annotation Term="UI.Hidden" Path="HideOrderValue"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

```xml
<!-- Dynamic UI.Hidden on a column that is only sort-restricted (still filterable) -->
<Annotations Target="SalesService.SalesOrders">
    <Annotation Term="Capabilities.SortRestrictions">
        <Record>
            <PropertyValue Property="NonSortableProperties">
                <Collection><PropertyPath>OrderValue</PropertyPath></Collection>
            </PropertyValue>
        </Record>
    </Annotation>
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="OrderValue"/>
                <Annotation Term="UI.Hidden" Path="HideOrderValue"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

**CDS:**

```cds
// Dynamic UI.Hidden on a column with no Capabilities restrictions
annotate service.SalesOrders with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: OrderValue,
        ![@UI.Hidden]: HideOrderValue,
    },
]);
```

```cds
// Dynamic UI.Hidden on a column that is only sort-restricted (still filterable)
annotate service.SalesOrders with @(
    Capabilities.SortRestrictions: {NonSortableProperties: [OrderValue]},
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: OrderValue,
            ![@UI.Hidden]: HideOrderValue,
        },
    ],
);
```

The following patterns are not considered warnings:

**XML:**

```xml
<!-- Static UI.Hidden (boolean) — back end is not affected -->
<Annotations Target="SalesService.SalesOrders">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="InternalNotes"/>
                <Annotation Term="UI.Hidden" Bool="true"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

```xml
<!-- Dynamic UI.Hidden allowed: column is restricted for BOTH sort and filter -->
<Annotations Target="SalesService.SalesOrders">
    <Annotation Term="Capabilities.SortRestrictions">
        <Record>
            <PropertyValue Property="NonSortableProperties">
                <Collection><PropertyPath>OptionalField</PropertyPath></Collection>
            </PropertyValue>
        </Record>
    </Annotation>
    <Annotation Term="Capabilities.FilterRestrictions">
        <Record>
            <PropertyValue Property="NonFilterableProperties">
                <Collection><PropertyPath>OptionalField</PropertyPath></Collection>
            </PropertyValue>
        </Record>
    </Annotation>
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="OptionalField"/>
                <Annotation Term="UI.Hidden" Path="ShowOptionalField"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

**CDS:**

```cds
// Static UI.Hidden (boolean) — back end is not affected
annotate service.SalesOrders with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Value: InternalNotes,
        ![@UI.Hidden]: true,
    },
]);
```

```cds
// Dynamic UI.Hidden allowed: column is restricted for BOTH sort and filter
annotate service.SalesOrders with @(
    Capabilities.SortRestrictions   : {NonSortableProperties: [OptionalField]},
    Capabilities.FilterRestrictions : {NonFilterableProperties: [OptionalField]},
    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Value: OptionalField,
            ![@UI.Hidden]: ShowOptionalField,
        },
    ],
);
```

### How to Fix

1. **Replace with static hiding** — if the column should always be hidden, use `<Annotation Term="UI.Hidden" Bool="true"/>` instead of a path.
2. **Restrict interactivity** — add the column's property to both `Capabilities.SortRestrictions/NonSortableProperties` and `Capabilities.FilterRestrictions/NonFilterableProperties` so the back end does not expose sorting or filtering for it.

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).
