# Require `condensedTableLayout` When Using Grid, Analytical, or Tree Tables (`sap-condensed-table-layout`)

## Rule Details

### For OData V4 Applications

This rule checks that `condensedTableLayout` is set to `true` in `tableSettings` within `controlConfiguration` in the `manifest.json` file for list report pages whenever a grid table, analytical table, or tree table is configured.

### For OData V2 Applications

This rule checks that `condensedTableLayout` is set to `true` in the page `settings` in the `manifest.json` file for list report pages whenever a grid table, analytical table, or tree table is configured.

### Why Was This Rule Introduced?

Grid tables, analytical tables, and tree tables are optimized for displaying large amounts of data in a compact format. The `condensedTableLayout` property enables a denser row height that is better suited for these table types. Omitting or disabling it leads to unnecessarily large rows and a suboptimal user experience.

### Warning Message

#### Incorrect `manifest.json` File in OData V4

```json
{
  "tableSettings": {
    "type": "GridTable"
  }
}
```

A grid table, analytical table, or tree table is used without `condensedTableLayout` enabled.

#### Incorrect `manifest.json` File in OData V2

```json
{
  "component": {
    "settings": {
      "tableSettings": {
        "type": "GridTable"
      }
    }
  }
}
```

A grid table, analytical table, or tree table is used without `condensedTableLayout` enabled at the page level.

#### Correct `manifest.json` File in OData V4

```json
{
  "tableSettings": {
    "type": "GridTable",
    "condensedTableLayout": true
  }
}
```

The `condensedTableLayout` property is set to `true` alongside the grid table.

#### Correct `manifest.json` File in OData V2

```json
{
  "component": {
    "settings": {
      "condensedTableLayout": true,
      "tableSettings": {
        "type": "GridTable"
      }
    }
  }
}
```

The `condensedTableLayout` property is set to `true` at the page `settings` level.

## How to Fix

### OData V4

Set `condensedTableLayout` to `true` in the `tableSettings` of the affected table control configuration in the `manifest.json` file.

### OData V2

Set `condensedTableLayout` to `true` in the `settings` of the affected list report page in the `manifest.json` file.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 Using the Condensed Table Layout - OData V4](https://ui5.sap.com/#/topic/f3cc057e405c4fd58ee2ed42c557797c)
- [UI5 Using the Condensed Table Layout - OData V2](https://ui5.sap.com/#/topic/432a2d21151641b2aeb93db719bd4423)

- [UI5 Setting the Table Type - OData V4](https://ui5.sap.com/#/topic/7f844f1021cd4791b8f7408eac7c1cec)
- [UI5 Setting the Table Type - OData V2](https://ui5.sap.com/#/topic/5d270547f113468e83e06dd7ee408a45)
