# `UI.FieldGroup` Is Not Supported in Grid, Tree, and Analytical Tables (`sap-field-group-in-table-type-restriction`)

Detects `UI.FieldGroup` references inside `UI.LineItem` when the configured table type does not support them.

The `UI.FieldGroup` annotation is only supported in `ResponsiveTable`. Using it in `GridTable`, `AnalyticalTable`, or `TreeTable` causes the annotation to be silently ignored. Grouped fields are not displayed in the table.

## Rule Details

The rule checks every `UI.DataFieldForAnnotation` record inside a `UI.LineItem`. If its `Target` property points to a `UI.FieldGroup` and the table's configured `tableSettings.type` is one of the unsupported types, that is, `GridTable`, `AnalyticalTable`, `TreeTable`, a violation is reported on the `DataFieldForAnnotation` record.

The rule covers all tables in an application:
- **List report pages**: tables bound directly to a `UI.LineItem` annotation.
- **Object page sections**: tables referenced by a `UI.ReferenceFacet` inside `UI.Facets`, including facets nested within a `UI.CollectionFacet`.

Applies to SAP Fiori elements for OData V2 and OData V4 applications.

### Warning

`UI.FieldGroup` is not supported in the selected table type. Change the table type to `ResponsiveTable` or use individual `UI.DataField` entries instead.

For object page tables, the section name (from the `ReferenceFacet`'s `Label`) is included in the message: `UI.FieldGroup is not supported in GridTable in the <Section Name> section.`

#### XML Annotations

The following patterns are considered warnings:

```xml
<!-- manifest.json: "tableSettings": { "type": "GridTable" } -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.LineItem">
        <Collection>
            <!-- Violation: FieldGroup not supported in GridTable -->
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#ContactData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

The rule also flags violations in object page tables referenced via `UI.Facets`, including tables nested inside a `UI.CollectionFacet`:

```xml
<!-- manifest.json on IncidentsObjectPage: controlConfiguration for "incidentFlow/@UI.LineItem": { "tableSettings": { "type": "GridTable" } } -->
<Annotations Target="MyService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="Label" String="Incident Details"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <!-- Violation reported here (section: "Incident Flow") -->
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Label" String="Incident Flow"/>
                            <PropertyValue Property="Target" AnnotationPath="incidentFlow/@UI.LineItem"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
<Annotations Target="MyService.IncidentFlow">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#FlowData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

The following patterns are not considered warnings:

```xml
<!-- manifest.json: "tableSettings": { "type": "ResponsiveTable" } -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.LineItem">
        <Collection>
            <!-- OK: FieldGroup is supported in ResponsiveTable -->
            <Record Type="UI.DataFieldForAnnotation">
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#ContactData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>

<!-- OK: Individual DataField entries work in all table types -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.LineItem">
        <Collection>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="FirstName"/>
            </Record>
            <Record Type="UI.DataField">
                <PropertyValue Property="Value" Path="LastName"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

#### CDS Annotations

The following patterns are considered warnings if the table type is `GridTable`, `AnalyticalTable`, or `TreeTable`:

```cds
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
        // Violation: FieldGroup not supported in GridTable
        Target: '@UI.FieldGroup#ContactData',
    }
]);
```

The following annotation patterns are not considered warnings:

```cds
// OK: DataFieldForAnnotation targeting a non-FieldGroup annotation
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
        Target: '@UI.Chart#SomeChart',
    }
]);
```

### How to Fix

Proceed with one of the following options:
- Change the table type to `ResponsiveTable` in the `manifest.json` file under `tableSettings.type`.
- Replace each `UI.DataFieldForAnnotation`, which targets a `UI.FieldGroup` with individual `UI.DataField` entries.

## Bug Report

If you encounter an issue with the rule, open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).
