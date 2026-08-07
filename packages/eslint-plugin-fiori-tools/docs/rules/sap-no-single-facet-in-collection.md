# `UI.CollectionFacet` Must Not Contain Only a Single `UI.ReferenceFacet` (`sap-no-single-facet-in-collection`)

Detects a `UI.CollectionFacet` that wraps exactly a single `UI.ReferenceFacet`.

When a collection facet contains only a single reference facet, the wrapper adds no structural value and can cause rendering issues on the object page. Use `UI.ReferenceFacet` directly under `UI.Facets` instead.

## Rule Details

This rule scans `UI.Facets` annotations and reports any `UI.CollectionFacet` record whose `Facets` property contains exactly one child of type `UI.ReferenceFacet`. It applies to both OData V2 and V4 annotation files.

### Warning
`UI.CollectionFacet` must not contain only one `UI.ReferenceFacet`. Use `UI.ReferenceFacet` directly under `UI.Facets` instead.

The following patterns are considered warnings:

```cds
// CollectionFacet with a single ReferenceFacet child
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Facets: [{
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#Details',
        }],
    }],
);
```

```cds
// Nested CollectionFacet with a single ReferenceFacet child (inner violation)
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'Outer',
        Facets: [
            {
                $Type : 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#Details',
            },
            {
                $Type : 'UI.CollectionFacet',
                ID    : 'Inner',
                Facets: [{
                    $Type : 'UI.ReferenceFacet',
                    Target: '@UI.FieldGroup#Address',
                }],
            },
        ],
    }],
);
```

```xml
<!-- CollectionFacet with a single ReferenceFacet child -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="GeneralInfo"/>
                <PropertyValue Property="Label" String="General Information"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

The following patterns are not considered warnings:

```cds
// ReferenceFacet used directly under UI.Facets
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Target: '@UI.FieldGroup#Details',
    }],
);
```

```cds
// CollectionFacet with multiple ReferenceFacet children
annotate service.Incidents with @(
    UI.Facets: [{
        $Type : 'UI.CollectionFacet',
        ID    : 'GeneralInfo',
        Label : 'General Information',
        Facets: [
            {
                $Type : 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#Details',
            },
            {
                $Type : 'UI.ReferenceFacet',
                Target: '@UI.FieldGroup#Address',
            },
        ],
    }],
);
```

```xml
<!-- ReferenceFacet used directly under UI.Facets -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="GeneralInfo"/>
                <PropertyValue Property="Label" String="General Information"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>

<!-- CollectionFacet with multiple ReferenceFacet children -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="GeneralInfo"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                        </Record>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Address"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

### How to Fix
Remove the `UI.CollectionFacet` wrapper and place the `UI.ReferenceFacet` directly inside the `UI.Facets` collection. Move the `ID` and `Label` properties from the collection facet to the reference facet.

## Bug Report

If you experience an issue with this rule, open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).
