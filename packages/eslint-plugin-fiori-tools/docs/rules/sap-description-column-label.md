# Require Meaningful Labels for Description (Text) Properties (`sap-description-column-label`)

Ensures that the property referenced as the description (text) value via `Common.Text` has a meaningful `Common.Label` — not a generic value such as `"Name"` or `"Description"`, and not the same label as the ID property it describes.

## Rule Details

When a field uses `Common.Text` to associate a human-readable description property with a technical key property, the description property should carry a label that clearly identifies its content. A generic label like `"Name"` or `"Description"` provides no useful context to the user in the UI (for example, as a column header in a table), and a label that is identical to the ID property's label creates ambiguity between the two columns.

The rule checks every `Common.Text` annotation on a property that belongs to an entity type used in the application (i.e. linked to at least one page via the manifest). For each such annotation the rule:

1. Resolves the path to the referenced text property (including navigation segments such as `category/name`).
2. Reads the `Common.Label` annotation on that property.
3. Flags the annotation if the label is `"Name"` or `"Description"` (case-insensitive) — **trivialLabel**.
4. Flags the annotation if the label is identical (case-insensitive) to the `Common.Label` of the ID property that carries `Common.Text` — **duplicateLabel**.

If the text property has no `Common.Label`, the rule does not flag it.

### Why Was This Rule Introduced?

When a property is displayed using a description column (e.g. `TextArrangement/TextOnly`), the column header comes from the `Common.Label` of the text property. A label of `"Name"` or `"Description"` is semantically meaningless in that context — it does not tell the user _which_ name or description is shown. Similarly, if the description column carries the exact same label as the ID column, the user cannot distinguish the two columns.

### Warning Messages

**trivialLabel**
```
The text property "{{textPropertyTarget}}" has a generic label "{{textPropertyLabel}}". Use a more descriptive label that distinguishes it from other properties.
```

**duplicateLabel**
```
The text property "{{textPropertyTarget}}" has the same label "{{textPropertyLabel}}" as the ID property "{{idPropertyTarget}}". The description column label should be different from the ID label.
```

## Examples

### Incorrect Annotations

**`trivialLabel` — the text property label is too generic:**

```xml
<!-- ProductBaseUnit uses UnitOfMeasure_Text as its description column -->
<Annotations Target="MyService.MyEntity/ProductBaseUnit">
    <Annotation Term="Common.Text" Path="to_BaseUnit/UnitOfMeasure_Text"/>
</Annotations>

<!-- The description property label is "Name" — too generic -->
<Annotations Target="MyService.BaseUnitType/UnitOfMeasure_Text">
    <Annotation Term="Common.Label" String="Name"/>
</Annotations>
```

**`duplicateLabel` — the text property shares its label with the ID property:**

```xml
<!-- Supplier uses CompanyName as its description column, and both have the label "Supplier" -->
<Annotations Target="MyService.MyEntity/Supplier">
    <Annotation Term="Common.Text" Path="to_Supplier/CompanyName"/>
    <Annotation Term="Common.Label" String="Supplier"/>
</Annotations>

<!-- Same label as the ID property above — ambiguous column headers -->
<Annotations Target="MyService.SupplierType/CompanyName">
    <Annotation Term="Common.Label" String="Supplier"/>
</Annotations>
```

### Correct Annotations

**Meaningful, distinct label for the text property:**

```xml
<Annotations Target="MyService.MyEntity/ProductBaseUnit">
    <Annotation Term="Common.Text" Path="to_BaseUnit/UnitOfMeasure_Text"/>
</Annotations>

<!-- Descriptive label that distinguishes the column from the ID column -->
<Annotations Target="MyService.BaseUnitType/UnitOfMeasure_Text">
    <Annotation Term="Common.Label" String="Unit of Measure"/>
</Annotations>
```

**Different labels for ID and text properties:**

```xml
<Annotations Target="MyService.MyEntity/Supplier">
    <Annotation Term="Common.Text" Path="to_Supplier/CompanyName"/>
    <Annotation Term="Common.Label" String="Supplier ID"/>
</Annotations>

<Annotations Target="MyService.SupplierType/CompanyName">
    <Annotation Term="Common.Label" String="Company Name"/>
</Annotations>
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## When Not to Disable This Rule

This rule should not be disabled unless you have a confirmed backend constraint that prevents renaming the label. In most cases the fix is straightforward: update the `Common.Label` on the text property to something meaningful and distinct from the ID property label.

## Further Reading

- [UI5 Further Features of the Field - OData V4](https://ui5.sap.com/#/topic/f49a0f7eaafe444daf4cd62d48120ad0)
- [UI5 Displaying Text and ID for Value Help Input Fields - OData V2](https://ui5.sap.com/#/topic/080886d8d4af4ac6a68a476beab17da3)
- [OData Common Vocabulary - Label](https://github.com/SAP/odata-vocabularies/blob/main/vocabularies/Common.md#Label)
