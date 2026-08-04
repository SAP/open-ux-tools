# UI.CollectionFacet must not contain only one UI.ReferenceFacet (sap-no-single-facet-in-collection)

Flags a `UI.CollectionFacet` that wraps exactly one `UI.ReferenceFacet`.

When a collection facet contains only a single reference facet, the wrapper adds no structural value and can cause rendering issues on the object page. Use `UI.ReferenceFacet` directly under `UI.Facets` instead.

## Rule Details

This rule scans `UI.Facets` annotations and reports any `UI.CollectionFacet` record whose `Facets` property contains exactly one child of type `UI.ReferenceFacet`. It applies to both OData V2 and V4 annotation files.

#### Single ReferenceFacet inside CollectionFacet

##### Warning Message: UI.CollectionFacet must not contain only one UI.ReferenceFacet. Use UI.ReferenceFacet directly under UI.Facets instead.

The following patterns are considered warnings:

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

How to Fix: Remove the `UI.CollectionFacet` wrapper and place the `UI.ReferenceFacet` directly inside the `UI.Facets` collection. Move the `ID` and `Label` properties from the collection facet to the reference facet.

## Bug Report

In case you detect an issue with the check please open a Github issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Defining and Configuring Sections](https://help.sap.com/docs/SAP_FIORI_ELEMENTS/fc4c71aa50014fd1b43721701471913d/facfea09018d4376acaceddb7e3f03b6.html)

## Release Information
