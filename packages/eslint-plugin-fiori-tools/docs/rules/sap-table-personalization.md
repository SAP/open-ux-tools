# Require the `personalization` Property in OData V4 Tables to Be Enabled in the `manifest.json` File (`sap-table-personalization`)

## Rule Details

Ensures that all table `personalization` properties are enabled in the pages of OData V4 applications. Table personalization is provided by default for all tables.

Restriction: Grouping is available for analytical tables in applications with SAPUI5 1.108 or higher and responsive tables in applications with SAPUI5 1.120 or higher.

### Why Was This Rule Introduced?

Users must see all the table personalization options that are available, such as adding or removing columns, filtering, sorting, and grouping.

### Warning Message

The following patterns are considered warnings:

### Incorrect `personalization` Values

```json
{
  "tableSettings": {
    "personalization": false
  }
}
```

Setting the `personalization` property to `false` disables all table personalization settings, so it is the same as setting every `personalization` subproperty to `false`:

```json
{
  "tableSettings": {
    "personalization": {
      "column" : false,
      "sort" : false,
      "filter" : false, 
      "group": false
    }
  }
}
```

If the value "object" is used, omitting a setting is treated as `false`.

```json
{
  "tableSettings": {
    "personalization": {}
  }
}
```

If you don't define all properties as `true`, all omitted properties are disabled, for example, `filter` and `group` are also `false`:

```json
{
  "tableSettings": {
    "personalization": {
      "column": true,
      "sort": false
    }
  }
}
```



The following patterns are considered correct:

### Correct `personalization` definition

```json
{
  "tableSettings": {
    "personalization": true
  }
}
```

The `personalization` property is set to `true` so every table setting is enabled.

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

Every table `personalization` property is set to `true`. Omitting table personalization from the `manifest.json` table settings is also correct, because all personalization settings are provided by default for all tables.

## How to Fix

To fix the warning, ensure that either the `personalization` property is set to `true` or not defined in the table settings.

You can use the quick fix provided by the plugin to set the `personalization` property to `true`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/sdk/#/topic/3e2b4d212b66481a829ccef1dc0ca16b)