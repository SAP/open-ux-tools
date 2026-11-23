# Ensure the Correct Paste Configuration for Tables in SAP Fiori Elements for V4 Applications (`sap-enable-paste`)

## Rule Details

### For OData V2 Applications

For OData V2 applications, the `showPasteButton` is a flex change property, so this rule checks if there is a `.change` file for the `showPasteButton` property, where the `newValue` is set to `false`. This property sets whether paste functionality is enabled in a table.

### For OData V4 Applications

This rule checks if the `enablePaste` property set to `false` in `tableSettings` in the `manifest.json` file for OData V4 applications. This property sets whether to enable the "Paste" button in Object Page tables.

### Why Was This Rule Introduced?

The paste functionality should not be hidden from the preview.

### Warning Message

#### Incorrect `manifest.json` File in OData V4

```json
{
  "tableSettings": {
    "enablePaste": false
  }
}
```

The `enablePaste` property is set to `false` which hides the "Paste" button.

#### Incorrect `.change` File in OData V2

```json
{
  "content": {
    "property": "showPasteButton",
    "newValue": false
  }
}
```

The `newValue` of the `showPasteButton` property is set to `false` which hides the "Paste" button.

#### Correct `manifest.json` File in OData V4

```json
{
  "tableSettings": {
    "enablePaste": true
  }
}
```

The `enablePaste` property is set to `true` or omitted from `tableSettings`.

#### Correct `.change` File in OData V2

```json
{
  "content": {
    "property": "showPasteButton",
    "newValue": true
  }
}
```

The `newValue` of the `showPasteButton` property is set to `true` to display the "Paste" button.

## How to Fix in OData V4

To fix the warning, remove the `enableExport` property from the `manifest.json` file. The "Paste" button is shown by default.

## How to Fix in OData V2

To fix the warning, there are two options: either delete the corresponding `.change` file, which restores the default setting, or set `newValue` in the property change file to `true`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Copying and Pasting from External Applications to Tables OData V4](https://ui5.sap.com/#/topic/f6a8fd2812d9442a9bba2f6fb296c42e)
- [Copying and Pasting from External Applications to Tables OData V2](https://ui5.sap.com/#/topic/181c4e6e6eaa411eb0fa0cd371726238)