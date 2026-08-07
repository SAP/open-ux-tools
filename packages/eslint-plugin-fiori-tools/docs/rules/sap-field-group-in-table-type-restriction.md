# `UI.FieldGroup` Is Not Supported in Grid, Tree, and Analytical tables (`sap-field-group-in-table-type-restriction`)

Detects `UI.FieldGroup` references inside `UI.LineItem` when the configured table type does not support them.

The `UI.FieldGroup` annotation is only supported in `ResponsiveTable`. Using it in `GridTable`, `AnalyticalTable`, or `TreeTable` causes the annotation to be silently ignored. Grouped fields are not displayed in the table.

## Rule Details

The rule checks every `UI.DataFieldForAnnotation` record inside a `UI.LineItem`. If its `Target` property points to a `UI.FieldGroup` and the table's configured `tableSettings.type` is one of the unsupported types, that is, `GridTable`, `AnalyticalTable`, `TreeTable`, a violation is reported on the `DataFieldForAnnotation` record.

Applies to SAP Fiori elements for OData V2 and OData V4 applications.

### Warning

`UI.FieldGroup` is not supported in {{tableType}}. Change the table type to `ResponsiveTable` or use individual `UI.DataField` entries instead.

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

The following patterns are considered warnings if the table type is `GridTable`, `AnalyticalTable` or `TreeTable`:

```cds
annotate service.Incidents with @(UI.LineItem: [
    {
        $Type : 'UI.DataFieldForAnnotation',
        // Violation: FieldGroup not supported in GridTable
        Target: '@UI.FieldGroup#ContactData',
    }
]);
```

The following annotationpatterns are not considered warnings:

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
- Replace each `UI.DataFieldForAnnotation` with a `UI.FieldGroup` or individual `UI.DataField` entries.

## Bug Report

If you encounter an issue with the rule, open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).
