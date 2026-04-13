# Require `tableColumnVerticalAlignment` Property in the `manifest.json` File (`sap-table-column-vertical-alignment`)

## Rule Details

Ensures that the `tableColumnVerticalAlignment` property for Responsive type tables is set to `Middle` or not defined in the `manifest.json`, as the default value is `Middle`. The rule is applicable to OData V2 applications with SAP UI5 version starting from 1.75.

### Why Was This Rule Introduced?

Ensuring this property is set to `Middle` helps maintain consistency in display of Responsive tables in UI5 applications.

### Warning Message

Available options for `tableColumnVerticalAlignment` are `Top`, `Middle` and `Bottom`. Setting `tableColumnVerticalAlignment` to anything other that `Middle` is considered a warning.

#### Incorrect `manifest.json` File

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "tableColumnVerticalAlignment": "Top"
    }
  }
}
```

## How to Fix

To fix the warning, ensure that the `tableColumnVerticalAlignment` property is set to `Middle` or remove the `tableColumnVerticalAlignment` definition from the settings. For example:

```json
{
  "sap.ui.generic.app": {
    "settings": {
      "tableColumnVerticalAlignment": "Middle"
    }
  }
}
```

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Tables Documentation](https://sapui5.hana.ondemand.com/#/topic/c0f6592a592e47f9bb6d09900de47412)