# UI.CollectionFacet should not be nested at third level or deeper (sap-no-deep-collection-facets)

SAP Fiori elements does not consider `UI.CollectionFacet` elements that are nested at the third level or deeper within the `UI.Facets` annotation. This rule detects deeply nested collection facets and recommends reorganizing the facet structure to use a maximum of two nesting levels for proper rendering and functionality.

## Rule Details

This rule checks `UI.Facets` annotations on object pages and identifies any `UI.CollectionFacet` records that appear at the third level of nesting or deeper. SAP Fiori elements supports up to two levels of `UI.CollectionFacet` nesting:

- **Level 1** (direct children of `UI.Facets`): ✅ Supported
- **Level 2** (children of level 1 `UI.CollectionFacet`): ✅ Supported  
- **Level 3 and deeper**: ❌ Not considered by Fiori elements

### Warning Message

```
UI.CollectionFacet at third level or deeper is not considered by SAP Fiori elements. Reorganize your facet structure to use a maximum of two levels.
```

### The following patterns are considered warnings:

**Three-level nesting:**

```xml
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="Level1"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.CollectionFacet">
                            <PropertyValue Property="ID" String="Level2"/>
                            <PropertyValue Property="Facets">
                                <Collection>
                                    <!-- ❌ Level 3 CollectionFacet - WARNING -->
                                    <Record Type="UI.CollectionFacet">
                                        <PropertyValue Property="ID" String="Level3"/>
                                        <PropertyValue Property="Facets">
                                            <Collection>
                                                <Record Type="UI.ReferenceFacet">
                                                    <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                                </Record>
                                            </Collection>
                                        </PropertyValue>
                                    </Record>
                                </Collection>
                            </PropertyValue>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

**CDS equivalent:**

```cds
annotate service.Incidents with @(
    UI.Facets : [
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'Level1',
            Facets: [
                {
                    $Type : 'UI.CollectionFacet',
                    ID    : 'Level2',
                    Facets: [
                        // ❌ Level 3 CollectionFacet - WARNING
                        {
                            $Type : 'UI.CollectionFacet',
                            ID    : 'Level3',
                            Facets: [
                                {
                                    $Type : 'UI.ReferenceFacet',
                                    Target: '@UI.FieldGroup#Details'
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
);
```

### The following patterns are not considered warnings:

**Two-level nesting (maximum supported depth):**

```xml
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="Level1"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <!-- ✅ Level 2 CollectionFacet - OK -->
                        <Record Type="UI.CollectionFacet">
                            <PropertyValue Property="ID" String="Level2"/>
                            <PropertyValue Property="Facets">
                                <Collection>
                                    <Record Type="UI.ReferenceFacet">
                                        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                    </Record>
                                </Collection>
                            </PropertyValue>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

**Single-level facets:**

```xml
<Annotations Target="IncidentService.Incidents">
    <Annotation Term="UI.Facets">
        <Collection>
            <!-- ✅ Direct ReferenceFacets - OK -->
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="Details"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
            </Record>
            <Record Type="UI.ReferenceFacet">
                <PropertyValue Property="ID" String="Address"/>
                <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Address"/>
            </Record>
        </Collection>
    </Annotation>
</Annotations>
```

## How to Fix

Reorganize your facet structure to flatten deeply nested `UI.CollectionFacet` elements. Consider one of these approaches:

1. **Remove unnecessary nesting:** If a `UI.CollectionFacet` contains only one child, replace it with a direct `UI.ReferenceFacet`.

2. **Flatten the hierarchy:** Move nested content up to a higher level by combining or reorganizing sections.

3. **Use side-by-side facets:** Place facets at the same level rather than nesting them deeply.

**Before (3 levels - violation):**

```xml
<Record Type="UI.CollectionFacet">
    <PropertyValue Property="ID" String="Outer"/>
    <PropertyValue Property="Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="Middle"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <Record Type="UI.CollectionFacet">
                            <PropertyValue Property="ID" String="Inner"/>
                            <PropertyValue Property="Facets">
                                <Collection>
                                    <Record Type="UI.ReferenceFacet">
                                        <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                                    </Record>
                                </Collection>
                            </PropertyValue>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </PropertyValue>
</Record>
```

**After (2 levels - correct):**

```xml
<Record Type="UI.CollectionFacet">
    <PropertyValue Property="ID" String="Outer"/>
    <PropertyValue Property="Facets">
        <Collection>
            <Record Type="UI.CollectionFacet">
                <PropertyValue Property="ID" String="Middle"/>
                <PropertyValue Property="Facets">
                    <Collection>
                        <!-- Flattened: use ReferenceFacet directly -->
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#Details"/>
                        </Record>
                    </Collection>
                </PropertyValue>
            </Record>
        </Collection>
    </PropertyValue>
</Record>
```

## Bug Report

In case you detect an issue with this rule, please open a GitHub issue [here](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAP Fiori Design Guidelines - Object Page Sections](https://experience.sap.com/fiori-design-web/object-page/)
- [UI.Facets Vocabulary Reference](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/UI.md#Facets)
