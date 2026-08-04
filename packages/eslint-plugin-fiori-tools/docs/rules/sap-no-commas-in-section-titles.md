# sap-no-commas-in-section-titles

## Rule Details

Section and subsection titles in SAP Fiori elements object pages must not contain commas. Commas serve as delimiters in the Fiori elements framework for grouping backend messages related to fields within sections or subsections. Using commas in `UI.Facets` or `UI.HeaderFacets` `Label` values will cause message grouping functionality to break at runtime.

This rule applies to both OData V2 and V4 applications and checks:

- `UI.Facets` → `UI.ReferenceFacet` → `Label` property
- `UI.Facets` → `UI.CollectionFacet` → `Label` property
- `UI.Facets` → `UI.CollectionFacet` → nested `UI.ReferenceFacet` → `Label` property (subsections)
- `UI.HeaderFacets` → `UI.ReferenceFacet` → `Label` property

## Why Was This Introduced?

The Fiori elements framework internally uses the facet label as a key for grouping OData backend messages. Because commas are used as delimiters in that grouping mechanism, a comma in a section title silently breaks the message display — validation errors and other backend messages are no longer grouped correctly under the section they belong to. The failure is invisible at design time and hard to trace at runtime.

## Warning / Error Examples

The following will trigger an error:

```xml
<!-- BAD: comma in ReferenceFacet label -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="Label" String="General Data, Overview"/>
                <PropertyValue Property="ID" String="GeneralData"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

**Error message:** `Section title "General Data, Overview" must not contain commas. Commas are used as delimiters for grouping backend messages and their presence in facet labels will break message grouping at runtime.`

```xml
<!-- BAD: comma in CollectionFacet subsection label -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="Label" String="Main Section"/>
                <PropertyValue Property="ID" String="MainSection"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Label" String="Details, Extra"/>
                            <PropertyValue Property="ID" String="Details"/>
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

## Correct Patterns

```xml
<!-- GOOD: no comma — use a dash or space instead -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="Label" String="General Data - Overview"/>
                <PropertyValue Property="ID" String="GeneralData"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

```xml
<!-- GOOD: no label at all (the framework uses a default) -->
<Annotations Target="MyService.MyEntity">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="GeneralData"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralData"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

## How to Fix

Remove commas from the `Label` string and use alternative punctuation such as a dash (`-`), an en dash (`–`), or simply a space to separate words.

This rule is **not auto-fixable** because the replacement depends on the intended meaning of the separator.

## Bug Report

Report issues at: https://github.com/SAP/open-ux-tools/issues

## Further Reading

- [Defining and Configuring Sections (SAP Fiori elements documentation)](https://ui5.sap.com/#/topic/facfea09018d4376acaceddb7e3f03b6)
- [SAP Fiori Design Guidelines – Object Page Layout](https://experience.sap.com/fiori-design-web/object-page/)
