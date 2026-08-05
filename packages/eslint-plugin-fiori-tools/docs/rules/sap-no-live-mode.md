# Ensure Live Mode Is Not Enabled (`sap-no-live-mode`)

## Rule Details

### Why Was This Rule Introduced?

Enabling `liveMode` makes the content area load automatically during the initial load of the application. This mode can have a negative impact on performance, especially when dealing with large datasets or complex database constraints, such as compiling complex join queries whenever there is a change in the filter field values. Live mode is disabled by default and must not be set to `true` in the `manifest.json`. Live mode also sets the visibility of the "Go" button in the application preview. When enabled, live mode hides the "Go" button from the filter bar in list report pages.

#### Incorrect `manifest.json` File for OData V4 Applications

```json
{
    "sap.ui5": {
        "routing": {
            "targets": {
                "TravelList": {
                    "name": "sap.fe.templates.ListReport",
                    "options": {
                        "settings": {
                        "liveMode": true,
                        // ...
                        }
                    // ...
                    }
                // ...
                }
            }
        }
    }
}
```
`liveMode` is set to `true` in the settings of the list report page.

#### Incorrect `.change` File for OData V2 Applications

```json
"content": {
    "property": "liveMode",
    "newValue": true
}
```
The `newValue` property for `liveMode` is set to `true`.

### Correct `manifest.json` File for OData V4 Applications

Set the `liveMode` property to `false` or remove it from the `manifest.json` file to restore the default settings.

### Correct `.change` File for OData V2 Applications

To fix the warning, there are two options: either delete the corresponding `.change` file, which restores the default setting, or set `newValue` in the property change file to `false`.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Enabling Live Mode - OData V4](https://ui5.sap.com/#/topic/4bd7590569c74c61a0124c6e370030f6.html#loio4bd7590569c74c61a0124c6e370030f6/live_mode_v4)
- [Configuring Filter Bars](https://ui5.sap.com/#/topic/4bd7590569c74c61a0124c6e370030f6)
- [API Reference](https://ui5.sap.com/#/api/sap.ui.comp.smartfilterbar.SmartFilterBar%23controlProperties)