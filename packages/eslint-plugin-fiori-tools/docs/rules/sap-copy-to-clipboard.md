# Ensure the Correct Copy ToClipboard Configuration for Tables in SAP Fiori Elements for OData V2 and V4 Applications (`sap-copy-to-clipboard`)

## Rule Details

### For OData V2 Applications

This rule checks if the `copy` property is not defined or set to `false` in `tableSettings` in the `manifest.json` file for OData V2 applications. This property sets whether to enable the copy to clipboard button in tables.

### For OData V4 Applications

This rule checks if the `disableCopyToClipboard` property is not defined or set to `true` in `tableSettings` in the `manifest.json` file for OData V4 applications. This property sets whether to disable the copy to clipboard button in tables.

### Why Was This Rule Introduced?

The copy functionality should not be hidden from the preview.

### Warning Message

#### Incorrect Manifest File in OData V2

```json
{
  "tableSettings": {
    "copy": false
  }
}
```

The `copy` property is set to `false` which hides the "Copy" button.

#### Incorrect Manifest File in OData V4

```json
{
  "tableSettings": {
    "disableCopyToClipboard": true
  }
}
```

The `disableCopyToClipboard` property is set to `true` which hides the "Copy" button.

#### Correct Manifest File in OData V2

```json
{
  "tableSettings": {
    "copy": true
  }
}
```

The `copy` property is correctly set to `true` or omitted from  `tableSettings`.

#### Correct Manifest File in OData V4

```json
{
  "tableSettings": {
    "disableCopyToClipboard": false
  }
}
```

The `disableCopyToClipboard` property is correctly set to `false` or omitted from  `tableSettings`.

## How to Fix

To fix the warning, remove it from the `manifest.json` file. The "Copy" button is shown by default.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412)