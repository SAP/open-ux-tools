# sap-grouping-supported-table-types-only

Grouping is only supported for `AnalyticalTable` and `ResponsiveTable` table types. Using a grouping configuration with `GridTable` or `TreeTable` types either has no effect or causes unexpected UI behaviour.

Grouping can be configured in two independent places:

- **Manifest** (`personalization.group` or `personalization = true` for V4 apps)
- **Annotation** (`UI.PresentationVariant.GroupBy` with a non-empty `PropertyPath` collection)

This rule checks both sources and reports the specific element where the unsupported grouping is declared.

## Rule details

### Incorrect

```xml
<!-- GridTable + UI.PresentationVariant GroupBy annotation (XML) -->
<Annotation Term="UI.PresentationVariant">
    <Record Type="UI.PresentationVariantType">
        <PropertyValue Property="GroupBy">
            <Collection>
                <PropertyPath>Category</PropertyPath>
            </Collection>
        </PropertyValue>
    </Record>
</Annotation>
```

```cds
// GridTable + UI.PresentationVariant GroupBy annotation (CDS)
annotate service.Incidents with @(
    UI.PresentationVariant: {
        GroupBy: [category]
    }
);
```

```json
// GridTable + manifest personalization.group = true
"tableSettings": {
    "type": "GridTable",
    "personalization": { "group": true }
}
```

### Correct

```json
// Switch to a table type that supports grouping
"tableSettings": {
    "type": "AnalyticalTable",
    "personalization": { "group": true }
}
```

## Supported table types

| Table type | Grouping supported |
|---|---|
| `AnalyticalTable` | Yes |
| `ResponsiveTable` | Yes |
| `GridTable` | No |
| `TreeTable` | No |

## Applicability

| Application type | Manifest check | Annotation check |
|---|---|---|
| Fiori Elements V4 | Yes | Yes |
| Fiori Elements V2 | No | Yes |

## Configuration

This rule is part of the `recommended-for-s4hana` configuration and is enabled as a warning by default.
