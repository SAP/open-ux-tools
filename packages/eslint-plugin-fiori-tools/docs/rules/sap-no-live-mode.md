# Ensure live mode is not enabled (`sap-no-live-mode`)

## Rule Details

### Why Was This Rule Introduced?

Enabling `liveMode` makes the content area load automatically during the initial load of the application. This mode can have a negative impact on performance, especially when dealing with large datasets or complex database constraints, such as compiling complex join queries whenever there is a change in the filter field values. Live mode is disabled by default and should not be set to `true` in the `manifest.json`. Live mode also sets the visibility of the "Go" button in the application preview: enabled live mode hides the button from the list report page filter bar.

#### Incorrect `manifest.json` File for ODataV4

```(json)
{
    "sap.ui5": {
        "routing": {
            "targets": {
                "TravelList": {
                    "name": "sap.fe.templates.ListReport",
                    "options": {
                        "settings": {
                        "liveMode": true,
                        ...
                        }
                    ...
                    }
                ...
                }
            }
        }
    }
}
```
`liveMode` is set to `true` in the list report page settings.

### Correct

Set the `liveMode` property to `false` or remove it from the `manifest.json` file to restore the default settings.

## Bug Report

If you encounter an issue with this rule, please open a [GitHub issue](https://github.com/SAP/open-ux-tools/issues).

## Further Reading

- [Enabling Live Mode - ODataV4](https://ui5.sap.com/#/topic/4bd7590569c74c61a0124c6e370030f6.html#loio4bd7590569c74c61a0124c6e370030f6/live_mode_v4)
- [Configuring Filter Bars](https://ui5.sap.com/#/topic/4bd7590569c74c61a0124c6e370030f6)
- [API Reference](https://ui5.sap.com/#/api/sap.ui.comp.smartfilterbar.SmartFilterBar%23controlProperties)