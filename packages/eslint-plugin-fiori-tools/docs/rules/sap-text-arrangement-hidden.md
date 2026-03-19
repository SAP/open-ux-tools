# Disallow Hidden Text Properties Referenced by `UI.TextArrangement` (`sap-text-arrangement-hidden`)

Ensures that a property referenced as the text (description) value via `Common.Text` for a field annotated with `UI.TextArrangement` is not hidden by `UI.Hidden`.

## Rule Details

When a field uses `UI.TextArrangement` (together with `Common.Text`) to display a human-readable description alongside a technical key, the referenced text property must be visible. If the text property has `UI.Hidden` set (without an explicit `false` value), the description will not be available to the UI and the text arrangement cannot work correctly.

The rule checks:
1. Every property annotated with `UI.TextArrangement` that also has a `Common.Text` annotation providing a path to a description property.
2. Whether the referenced description property has `UI.Hidden` present and not explicitly set to `false`.

Dynamic `UI.Hidden` path expressions (e.g. `Path="IsHidden"`) are not flagged since visibility cannot be determined statically.

### Why Was This Rule Introduced?

`UI.TextArrangement` controls how a key–text pair is presented (e.g. "English (EN)" or "EN (English)"). If the referenced text property is hidden via `UI.Hidden`, the text part is unavailable, causing the annotation to have no effect and potentially confusing users with missing descriptions.

### Warning Message

```
The text property "{{textPropertyPath}}" referenced via Common.Text on "{{targetPath}}" is hidden. Remove the UI.Hidden annotation from the text property or set it to false.
```

### Incorrect Annotation

```xml
<!-- property_code has a TextArrangement (nested inside Common.Text) that references category/name as the text -->
<Annotations Target="MyService.MyEntity/property_code">
    <Annotation Term="Common.Text" Path="category/name">
        <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
    </Annotation>
</Annotations>

<!-- The referenced text property is hidden — this is incorrect -->
<Annotations Target="MyService.Category/name">
    <Annotation Term="UI.Hidden"/>
</Annotations>
```

### Correct Annotation

```xml
<!-- property_code has a TextArrangement (nested inside Common.Text) that references category/name as the text -->
<Annotations Target="MyService.MyEntity/property_code">
    <Annotation Term="Common.Text" Path="category/name">
        <Annotation Term="UI.TextArrangement" EnumMember="UI.TextArrangementType/TextFirst"/>
    </Annotation>
</Annotations>

<!-- The referenced text property is visible — no UI.Hidden -->
<Annotations Target="MyService.Category/name">
    <!-- no UI.Hidden annotation here -->
</Annotations>
```

Or if the property should not be hidden in this context, explicitly set `UI.Hidden` to `false`:

```xml
<Annotations Target="MyService.Category/name">
    <Annotation Term="UI.Hidden" Bool="false"/>
</Annotations>
```

## When Not to Disable This Rule

This rule should not be disabled unless you have a specific scenario where the text property needs to be hidden globally but the annotation is intentionally kept for a different consumption context (e.g. a back-end consumer that processes annotations directly). Such cases are very uncommon, and a `Bool="false"` override is the preferred solution.
