---
'@sap-ux/ui-components': patch
---

UIComboBox/UIDropdown:
Fixed an issue where `calloutCollisionTransformation` gets overwritten when external listeners are passed for the following props:
- calloutProps.preventDismissOnEvent
- calloutProps.layerProps.onLayerDidMount
- calloutProps.layerProps.onLayerWillUnmount
