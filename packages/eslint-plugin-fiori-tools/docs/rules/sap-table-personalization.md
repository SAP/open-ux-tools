# Require `personalization` Property in OData V4 Tables is Enabled in the `manifest.json` File (`sap-table-personalization`)

## Rule Details

Ensures that all table `personalization` options are enabled on the OData V4 application pages. Table personalization is provided by default for all tables.

Restriction: grouping is available for Analytical tables in applications with minUI5 version starting from 1.108 and Responsive tables in applications with minUI5 version starting from 1.120.

### Why Was This Rule Introduced?

Users should see all table personalization options that are available: dding or removing columns, filtering, sorting, and grouping.

### Warning Message

The following patterns are considered warnings:

#### Incorrect Manifest File

```json
{
  "tableSettings": {
    "personalization": false
  }
}
```

Setting `personalization` property to false disables every table personalization setting.

#### Incorrect Value for `personalization` Properties

```json
{
  "tableSettings": {
    "personalization": {}
  }
}
```

If the value "object" is used, omitting a setting is treated as `false`.

The following patterns are considered correct:

#### Correct Manifest File

```json
{
  "tableSettings": {
    "personalization": true
  }
}
```

The `personalization` property is correctly set to `true`, every table setting is enabled.

#### Correct Manifest File

```json
{
  "tableSettings": {
    "personalization": {
      "column" : true,
      "sort" : true,
      "filter" : true, 
      "group": true
    }
  }
}
```

Every table `personalization` property is correctly set to `true`.
Omitting table personalization from the `manifest.json` table settings is also correct, because all personalization settings are provided by default for all tables.

## How to Fix

To fix the warning, ensure that either the `personalization` property is set to `true` or not defined in the table settings.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/sdk/#/topic/3e2b4d212b66481a829ccef1dc0ca16b)