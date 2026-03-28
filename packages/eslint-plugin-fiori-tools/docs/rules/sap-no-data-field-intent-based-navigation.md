# Ensure neither `DataFieldForIntentBasedNavigation` nor `DataFieldWithIntentBasedNavigation` Are Used in Tables or Form Fields in SAP Fiori Elements for OData V2 and V4 Non-CAP Applications (`sap-no-data-field-intent-based-navigation`)

## Rule Details

### Why Was This Rule Introduced?

Using `UI.DataFieldForIntentBasedNavigation` or `UI.DataFieldWithIntentBasedNavigation` inside tables or form fields hard‑codes a specific semantic object and action pair and bypasses SAP Fiori launchpad intent resolution. This blocks role‑aware, multi‑target navigation, and the Smart Link popover experience. Instead, annotate the field with `Common.SemanticObject` so SAP Fiori elements renders a smart link that SAP Fiori launchpad resolves at runtime.

### Warning Message

#### Incorrect `UI.LineItem` Annotation Using `UI.DataFieldForIntentBasedNavigation` and `UI.DataFieldWithIntentBasedNavigation`

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

#### Incorrect `UI.FieldGroup` Annotation Using `UI.DataFieldForIntentBasedNavigation` and `UI.DataFieldWithIntentBasedNavigation`

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

#### Correct: Semantic Link or Smart Link Navigation Is Used

The `sap.ui.comp.navpopover.SmartLink` control provides a popover with navigation links to related applications, for example, more detailed information about customer data.
For more information about this control, see the [API Reference](https://ui5.sap.com/#/api/sap.ui.comp.navpopover.SmartLink) and the [samples](https://ui5.sap.com/#/entity/sap.ui.comp.navpopover.SmartLink).

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation: Smart Link](https://ui5.sap.com/#/topic/f638884d0d624ad8a243f4005f8e9972)