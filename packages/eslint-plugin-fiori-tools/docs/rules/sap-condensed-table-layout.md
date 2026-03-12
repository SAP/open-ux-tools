# Require `condensedTableLayout` When Using Grid, Analytical, or Tree Tables (`sap-condensed-table-layout`)

## Rule Details

This rule checks that `condensedTableLayout` is enabled whenever a Grid Table, Analytical Table, or Tree Table is configured in the `manifest.json`. These table types require compact row layout to display data efficiently.

### Why Was This Rule Introduced?

Grid Table, Analytical Table, and Tree Table are optimised for displaying large amounts of data in a compact format. The `condensedTableLayout` property enables a denser row height that is better suited for these table types. Omitting or disabling it leads to unnecessarily large rows and a suboptimal user experience.

### Warning Message

#### Incorrect Manifest File

```json
{
  "tableSettings": {
    "type": "GridTable"
  }
}
```

A Grid Table (or Analytical Table or Tree Table) is used without `condensedTableLayout` enabled.

#### Correct Manifest File

```json
{
  "tableSettings": {
    "type": "GridTable",
    "condensedTableLayout": true
  }
}
```

The `condensedTableLayout` property is set to `true` alongside the compact table type.

## How to Fix

Set `condensedTableLayout` to `true` in the `tableSettings` of the affected table control configuration in `manifest.json`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [SAP Fiori elements for OData V4 – Table Settings](https://ui5.sap.com/sdk/#/topic/d525522c1bf54672ae4e02d66b38e60c)
