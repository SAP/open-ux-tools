# Ensure Neither DataFieldForIntentBasedNavigation nor DataFieldWithIntentBasedNavigation are Used in Tables or Form Fields in SAP Fiori Elements for OData V2 and V4 non-CAP Applications (`sap-no-data-field-intent-based-navigation`)

## Rule Details

### Why Was This Rule Introduced?

TODO

### Warning Message

#### Incorrect UI.LineItem Annotation using UI.DataFieldForIntentBasedNavigation and UI.DataFieldWithIntentBasedNavigation

```xml
<Annotation Term="UI.LineItem">
    <Collection>
        <Record Type="UI.DataFieldForIntentBasedNavigation">
            <PropertyValue Property="SemanticObject" String="test"/>
        </Record>
        <Record Type="UI.DataFieldWithIntentBasedNavigation">
            <PropertyValue Property="Value" Bool="false" />
            <PropertyValue Property="SemanticObject" String="" />
        </Record>
    </Collection>
</Annotation>
```

#### Incorrect UI.FieldGroup Annotation using UI.DataFieldForIntentBasedNavigation and UI.DataFieldWithIntentBasedNavigation

```xml
<Annotation Term="UI.FieldGroup" Qualifier="test">
    <Record Type="UI.FieldGroupType">
        <PropertyValue Property="Data">
            <Collection>
                <Record Type="UI.DataFieldForIntentBasedNavigation">
                    <PropertyValue Property="SemanticObject" String="test" />
                    <PropertyValue Property="Action" String="toappnavsample" />
                </Record>
                <Record Type="UI.DataFieldWithIntentBasedNavigation">
                    <PropertyValue Property="Value" Int="1" />
                    <PropertyValue Property="SemanticObject" String="" />
                </Record>
            </Collection>
        </PropertyValue>
    </Record>
</Annotation>
```

#### Correct: Semantic Link Navigation is Used

```xml
TODO
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](TODO)