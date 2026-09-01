# Ensure Section and Subsection Titles Do Not Contain Commas (`sap-no-comma-in-section-title`)

## Rule Details

### Why Was This Rule Introduced?

In SAP Fiori Elements object pages, section and subsection titles must not contain commas. Commas are used as delimiters for backend message grouping, so a comma in a section title can cause messages to be routed incorrectly, leading to unexpected behavior in error and status message handling.

This rule checks both:
- Direct string labels in OData annotation XML files (e.g., `String="Products, Details"`)
- i18n property values whose keys are bound as section labels (e.g., a key used as `{@i18n>sectionTitle}` where the value contains a comma)

#### Incorrect OData Annotation File

```xml
<Annotation Term="UI.Facets">
    <Collection>
        <Record Type="UI.ReferenceFacet">
            <PropertyValue Property="Label" String="Products, Details" />
            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralInfo"/>
        </Record>
    </Collection>
</Annotation>
```

The label `"Products, Details"` contains a comma.

#### Incorrect i18n File

```properties
# When the annotation uses {@i18n>sectionTitle}
sectionTitle=Products, Details
```

The i18n value bound as a section label contains a comma.

#### Correct OData Annotation File

```xml
<Annotation Term="UI.Facets">
    <Collection>
        <Record Type="UI.ReferenceFacet">
            <PropertyValue Property="Label" String="Products Details" />
            <PropertyValue Property="Target" AnnotationPath="@UI.FieldGroup#GeneralInfo"/>
        </Record>
    </Collection>
</Annotation>
```

#### Correct i18n File

```properties
sectionTitle=Products Details
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Object Page - Defining and Adapting Sections](https://ui5.sap.com/#/topic/facfea09018d4376acaceddb7e3f03b6)
- [UI.Facets Vocabulary](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/UI.md#Facets)
