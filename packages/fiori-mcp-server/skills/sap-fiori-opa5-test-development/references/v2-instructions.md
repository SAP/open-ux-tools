# OData V2 - `fioriElementsTestLibrary`

For OData V2 applications, the test library is `sap/suite/ui/generic/template/integration/testLibrary`. It provides ready-made OPA5 page objects for List Report and Object Page and is completely separate from `sap.fe.test` - never mix the two.

The full API reference for this library is in `references/fiori-elements-v2-test-library.md`. Read it before writing any V2 test code.

---

## Key Differences from V4

| Aspect | V2 (`fioriElementsTestLibrary`) | V4 (`sap.fe.test`) |
|---|---|---|
| Runner | No JourneyRunner - use `Opa5.extendConfig` directly | `sap.fe.test.JourneyRunner` in `pages/JourneyRunner.js` |
| OPA config | `Opa5.extendConfig({ autoWait, timeout, ... })` | `opaConfig` in JourneyRunner constructor |
| Page objects | `onTheGenericListReport`, `onTheGenericObjectPage` (fixed names) | `onTheEntityNameList`, `onTheEntityNameObjectPage` (custom names) |
| App start | `Given.iStartMyAppInAFrame("index.html")` | `Given.iStartMyApp("intent-action")` |
| Config key | `appId` + `entitySet` in `Opa5.extendConfig` | `contextPath` in page object constructor |

---

## Setup

Configure the test library via `Opa5.extendConfig` **before** loading page objects:

```javascript
Opa5.extendConfig({
    testLibs: {
        fioriElementsTestLibrary: {
            Common: {
                appId: "my.namespace.app",   // sap.app.id from manifest.json
                entitySet: "MyEntitySet"      // primary entity set of the List Report
            }
        }
    },
    autoWait: true,
    timeout: 60,                             // increase for CI/CD environments
    pollingInterval: 400,
    appParams: { "sap-ui-animation": false }
});
```

`appId` and `entitySet` drive all internal ID-prefix construction - getting these right is the single most important configuration step.

Then load the page object modules:

```javascript
sap.ui.define([
    "sap/suite/ui/generic/template/integration/testLibrary/ListReport/pages/ListReport",
    "sap/suite/ui/generic/template/integration/testLibrary/ObjectPage/pages/ObjectPage"
], function() { "use strict"; });
```

Loading these modules registers `onTheGenericListReport` and `onTheGenericObjectPage` globally on the OPA5 runtime.

---

## Teardown Rules

Same rule as V4: always assert something before tearing down, and call `iTeardownMyApp()` on `Given`.

```javascript
opaTest("Should assert state and clean up", function(Given, When, Then) {
    Then.onTheGenericObjectPage.theObjectPageIsInDisplayMode(); // assertion first
    Given.iTeardownMyApp();                                     // teardown on Given
});
```

---

## Mock Data

V2 apps typically use the SAP mock server configured via `localService/mockserver.js` and `localService/metadata.xml`. Ensure mock data JSON files exist under `localService/mockdata/` (one file per entity set, named to match the entity set).

---

## Full API Reference

For full API reference, method signatures, common pitfalls, and a complete example, read `references/fiori-elements-v2-test-library.md`.
