---
"@sap-ux/preview-middleware": patch
---

FIX: Keep the application page footer visible in the adaptation editor. The RTA Stretch plugin adds a top padding (`sapUiRtaStretchPaddingTop`, `--sapContent_Space_Medium`) to the stretched root. In the viewport-locked, `overflow:hidden` preview sandbox that padding shifts the app down and pushes the bottom of the page (e.g. a `sap.m.Page` footer and its buttons) out of view. Since the native RTA toolbar is already hidden in the developer-mode preview, the compensating stretch padding is now removed as well.
