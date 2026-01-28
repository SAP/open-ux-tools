# `disableCopyToClipboard` Property in the `manifest.json` File (`sap-disable-copy-to-clipboard`)

Ensures that the `disableCopyToClipboard` property in all tables is set to `false` or ommited from `tableSettings` in the `manifest.json` file for OData V4 applications. The default value is `false`.

## Rule Details

This rule checks if the `disableCopyToClipboard` property is not defined or set to `true` in `tableSettings` in the `manifest.json` file for OData V4 applications. This property sets whether to disable the copy to clipboard button in tables.

### Why Was This Rule Introduced?

The copy functionality should not be hidden from the preview.

### Warning Message

#### Incorrect Manifest File

```json
{
  "tableSettings": {
    "disableCopyToClipboard": true
  }
}
```

The `disableCopyToClipboard` property is set to `true` which hides the "Copy" button.

#### Correct Manifest File

```json
{
  "tableSettings": {
    "disableCopyToClipboard": false
  }
}
```

The `disableCopyToClipboard` property is correctly set to `false` or omitted from  `tableSettings`.

## How to Fix

To fix the warning, remove it from the `manifest.json` file or set it to `false`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [UI5 UI Adaptation Documentation](https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412)