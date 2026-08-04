# Require Meaningful Labels for Description (Text) Properties (`sap-description-column-label`)

Ensures that the property referenced as the description (text) value using the `Common.Text` annotation has a meaningful `Common.Label` annotation. The label must not be a generic value such as `"Name"` or `"Description"` nor the same label as the ID property it describes.

## Rule Details

When a field uses the `Common.Text` annotation to associate a human-readable description property with a technical key property, the description property must carry a `Common.Label` annotation that clearly identifies its content. A generic label such as `"Name"` or `"Description"` provides no useful context to the user in the UI and a label that is identical to the ID property's label creates ambiguity.

The rule checks every `Common.Text` annotation on a property that belongs to an entity type used in the application, that is linked to at least one page in the `manifest.json` file. For each annotation, the rule performs the following:

1. Resolves the path to the referenced text property which includes navigation segments such as `category/name`.
2. Reads the `Common.Label` annotation on that property.
3. Produces a `trivialLabel` warning if the label is the same as `"Name"` or `"Description"` (case-insensitive).
4. Produces a `duplicateLabel` warning if the label is identical (case-insensitive) to the `Common.Label` annotation of the ID property that carries the `Common.Text` annotation.

If the text property has no `Common.Label` annotation, the rule does not produce a warning.

> **OData V2**: This rule also applies to OData V2 services. In OData V2 metadata, the `sap:text` attribute on a `Property` element is treated as an implicit `Common.Text` annotation and the `sap:label` attribute is treated as an implicit `Common.Label` annotation. The rule reports on the metadata file directly when these inline attributes produce a trivial or duplicate label.

### Why Was This Rule Introduced?

When a property is displayed using a description column, for example, `TextArrangement/TextOnly`, the column header comes from the `Common.Label` annotation of the text property. A label of `"Name"` or `"Description"` is semantically meaningless in that context, it does not tell the user which name or description is shown. Similarly, if the description column carries the exact same label as the ID column, the user cannot distinguish the two columns.

### Warning Messages

`trivialLabel`
```
The "{{textPropertyTarget}}" text property has a "{{textPropertyLabel}}" generic label. Use a more descriptive label that distinguishes it from other properties.
```

`duplicateLabel`
```
The "{{textPropertyTarget}}" text property has the same "{{textPropertyLabel}}" label as the "{{idPropertyTarget}}" ID property. The description column label must be different from the ID label.
```

### Incorrect Annotations

`trivialLabel`: The `Common.Label` annotation on the text property is too generic:

```xml
<!-- ProductBaseUnit uses UnitOfMeasure_Text as its description column using the Common.Text annotation -->
<Annotations Target="MyService.MyEntity/ProductBaseUnit">
    <Annotation Term="Common.Text" Path="to_BaseUnit/UnitOfMeasure_Text"/>
</Annotations>

<!-- The Common.Label annotation on the description property is "Name" which is too generic -->
<Annotations Target="MyService.BaseUnitType/UnitOfMeasure_Text">
    <Annotation Term="Common.Label" String="Name"/>
</Annotations>
```

```cds
annotate service.MyEntity with {
    productBaseUnit @Common.Text: to_BaseUnit.unitOfMeasure_Text
};

annotate service.BaseUnitType with {
    unitOfMeasure_Text @Common.Label: 'Name'
};
```

`duplicateLabel`: The `Common.Label` annotation on the text property is identical to the ID property label:

```xml
<!-- Supplier uses CompanyName as its description column using the Common.Text annotation but both properties have the "Supplier" label -->
<Annotations Target="MyService.MyEntity/Supplier">
    <Annotation Term="Common.Text" Path="to_Supplier/CompanyName"/>
    <Annotation Term="Common.Label" String="Supplier"/>
</Annotations>

<!-- Common.Label annotation identical to the ID property above which leads to ambiguous column headers -->
<Annotations Target="MyService.SupplierType/CompanyName">
    <Annotation Term="Common.Label" String="Supplier"/>
</Annotations>
```

```cds
annotate service.MyEntity with {
    supplier @(
        Common.Text : to_Supplier.companyName,
        Common.Label: 'Supplier',
    )
};

annotate service.SupplierType with {
    companyName @Common.Label: 'Supplier'
};
```

`trivialLabel` for OData V2: The inline `sap:label` on the text property is too generic. This is reported on the metadata file:

```xml
<!-- sap:text attribute acts as an implicit Common.Text annotation -->
<Property Name="Product" Type="Edm.String" sap:text="ProductName" sap:label="Product ID" />
<!-- sap:label="Name" acts as an implicit Common.Label annotation — too generic -->
<Property Name="ProductName" Type="Edm.String" sap:label="Name" />
```

`duplicateLabel` for OData V2: The inline `sap:label` values on ID and text property are identical:

```xml
<!-- Both properties carry sap:label="Quantity Unit" using the inline sap:label attribute -->
<Property Name="QuantityUnit" Type="Edm.String" sap:text="QuantityUnitT" sap:label="Quantity Unit" />
<Property Name="QuantityUnitT" Type="Edm.String" sap:label="Quantity Unit" />
```

### Correct Annotations

The `Common.Label` annotation on the text property is meaningful and unique:

```xml
<Annotations Target="MyService.MyEntity/ProductBaseUnit">
    <Annotation Term="Common.Text" Path="to_BaseUnit/UnitOfMeasure_Text"/>
</Annotations>

<!-- Common.Label annotation with a descriptive value that distinguishes the column from the ID column -->
<Annotations Target="MyService.BaseUnitType/UnitOfMeasure_Text">
    <Annotation Term="Common.Label" String="Unit of Measure"/>
</Annotations>
```

```cds
annotate service.MyEntity with {
    productBaseUnit @Common.Text: to_BaseUnit.unitOfMeasure_Text
};

annotate service.BaseUnitType with {
    unitOfMeasure_Text @Common.Label: 'Unit of Measure'
};
```

The `Common.Label` annotations on ID and text properties are unique:

```xml
<Annotations Target="MyService.MyEntity/Supplier">
    <Annotation Term="Common.Text" Path="to_Supplier/CompanyName"/>
    <Annotation Term="Common.Label" String="Supplier ID"/>
</Annotations>

<Annotations Target="MyService.SupplierType/CompanyName">
    <Annotation Term="Common.Label" String="Company Name"/>
</Annotations>
```

```cds
annotate service.MyEntity with {
    supplier @(
        Common.Text : to_Supplier.companyName,
        Common.Label: 'Supplier ID',
    )
};

annotate service.SupplierType with {
    companyName @Common.Label: 'Company Name'
};
```

The `sap:label` values on ID and text property for OData V2 are unique:

```xml
<Property Name="QuantityUnit" Type="Edm.String" sap:text="QuantityUnitT" sap:label="Quantity Unit" />
<!-- The sap:label is unique which provides unambiguous column headers -->
<Property Name="QuantityUnitT" Type="Edm.String" sap:label="Unit of Measure Text" />
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## When Not to Disable This Rule

This rule must not be disabled unless you have a confirmed back-end constraint that prevents renaming the label. Update the `Common.Label` annotation or the `sap:label` attribute for OData V2 on the text property to something meaningful and distinct from the ID property label.

## Further Reading

- [UI5 Further Features of the Field - OData V4](https://ui5.sap.com/#/topic/f49a0f7eaafe444daf4cd62d48120ad0)
- [UI5 Displaying Text and ID for Value Help Input Fields - OData V2](https://ui5.sap.com/#/topic/080886d8d4af4ac6a68a476beab17da3)
- [OData Common Vocabulary - Text](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md#Text)
- [OData Common Vocabulary - Label](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md#Label)
