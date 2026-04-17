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

### Correct: Semantic Link or Smart Link Navigation Is Used Using `Common.SemanticObject` on the Entity Property

Annotate the entity property, for example,`CustomerId`, with the `Common.SemanticObject` annotation before using it in a `UI.LineItem` or `UI.FieldGroup`. SAP Fiori elements automatically detects this and renders the field as a semantic link.

#### Step 1: Annotate the Entity Property:

```xml
<!-- Applied to the actual OData property, NOT inside DataField -->
<Annotations Target="YourEntityType/CustomerId">
    <Annotation Term="Common.SemanticObject" String="Customer"/>
</Annotations>
```

#### Step 2: Reference the Property in Your UI Annotations:
Note: No navigation annotation is needed.

For a table column using the `UI.LineItem` annotation:

```xml
<Annotation Term="UI.LineItem">
    <Collection>
        <Record Type="UI.DataField">
            <PropertyValue Property="Value" Path="CustomerId"/>
            <PropertyValue Property="Label" String="Customer"/>
            <!-- Semantic Link rendered automatically due to Common.SemanticObject on CustomerId property -->
        </Record>
    </Collection>
</Annotation>
```

For a form field using the `UI.FieldGroup` annotation:

```xml
<Annotation Term="UI.FieldGroup" Qualifier="GeneralInformation">
    <Record Type="UI.FieldGroupType">
        <PropertyValue Property="Data">
            <Collection>
                <Record Type="UI.DataField">
                    <PropertyValue Property="Value" Path="CustomerId"/>
                    <PropertyValue Property="Label" String="Customer"/>
                    <!-- Semantic Link rendered automatically due to Common.SemanticObject on CustomerId property -->
                </Record>
            </Collection>
        </PropertyValue>
    </Record>
</Annotation>
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Semantic Link Implementation in SAP Fiori Elements](https://ui5.sap.com/#/topic/c18ada4bc56e427a9a2df2d1898f28a5)
- [Smart Link and Navigation Intents](https://ui5.sap.com/#/topic/d782acf8bfd74107ad6a04f0361c5f62)