# JourneyRunner Configuration

`sap.fe.test.JourneyRunner` is the Fiori Elements replacement for raw `Opa5.extendConfig`. It provides a shared, pre-configured runner that all OPA5 journey files in the project import and reuse.

---

## Standard Setup: `pages/JourneyRunner.js`

Create a single shared runner file that all journeys import:

```javascript
sap.ui.define([
    "sap/fe/test/JourneyRunner",
    "com/myorg/myapp/test/integration/pages/EntityNameList",
    "com/myorg/myapp/test/integration/pages/EntityNameObjectPage"
], function (JourneyRunner, EntityNameList, EntityNameObjectPage) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/myorg/myapp') + '/test/flp.html#<tile-name>',
        pages: {
            onTheEntityNameList: EntityNameList,
            onTheEntityNameObjectPage: EntityNameObjectPage
        },
        async: true
    });

    return runner;
});
```

The tile name passed to `iStartMyApp()` is the hash fragment used to launch the app. How to find it depends on the
setup:

### Virtual FLP sandbox (preview-middleware, most modern apps):

The tile name is `<intent.object>-<intent.action>` from the `flp` configuration in `ui5.yaml` (or `ui5-mock.yaml`).
If not explicitly configured, the middleware derives it from the app's `sap.app.id` in `manifest.json` (dots removed) with action `preview`. Check `ui5.yaml`:

```yaml
  server:
    customMiddleware:
      - name: fiori-tools-preview
        configuration:
          flp:
            intent:
              object: travellist
              action: preview      # tile name = "travellist-preview"
```

If no intent is configured, the default tile name is app-preview.

### Physical flpSandbox.html (classic setup):

Look in webapp/test/flpSandbox.html for the applications key:

```html
  applications: {
    "travellist-tile": {   // <- this is the tile name
                         ...
    }
  }
```

The `launchUrl` hash fragment must match this key exactly.

---

## Portable Journey Pattern

Each journey file is self-contained. It imports the shared runner, defines its tests, and calls `runner.run(...)`:

```javascript
sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("Feature Name Journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp("myapp-tile");
            Then.onTheEntityNameList.iSeeThisPage();
        });

        // ... additional test steps ...

        opaTest("Teardown", function (Given, When, Then) {
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});
```

**`iStartMyApp("<tile-name>")`** is the Fiori Elements equivalent of the base OPA5 `iStartMyAppInAFrame`. The tile name must match the hash fragment of the FLP sandbox URL (see "Finding the tile name" above).

---

## `OpaTests.qunit.js` - Suite Entry Point (physical files only)

In the classic setup (no virtual endpoint), this file is the loader - it lists journey modules and starts QUnit. It has no knowledge of pages, runner configuration, or test logic:

```javascript
window.QUnit = Object.assign({}, window.QUnit, { config: { autostart: false } });

sap.ui.require(
    [
        "sap/ui/thirdparty/qunit-2",
        "sap/ui/qunit/qunit-junit",
        "sap/ui/qunit/qunit-coverage",
        "com/myorg/myapp/test/integration/FirstJourney"
    ], function (QUnit) {
        "use strict";
        QUnit.start();
    }
);
```

When the virtual endpoint is active (see SKILL.md "Generated Test Structure"), this file does not exist on disk - the middleware generates it automatically by scanning for journey files matching the configured pattern.

---

## Adding a New Journey

**Virtual endpoint setup (most modern apps):**
Create a new journey file (e.g., `webapp/test/integration/MyFeatureJourney.js`) following the portable journey pattern above. The middleware picks it up automatically as long as the filename matches the configured glob pattern (default: ends in `Journey.js` or `Journey.ts`). No other changes needed.

**Physical files setup:**
1. Create the journey file following the portable journey pattern above.
2. Register its module path in `OpaTests.qunit.js` - add it to the `sap.ui.require` array.

In both cases, no changes to `JourneyRunner.js` or page object files are needed unless the journey uses a page not yet registered in the runner's `pages` map.

---

## JourneyRunner Constructor Options

| Option | Type | Description |
|---|---|---|
| `launchUrl` | string | Full URL to the FLP sandbox HTML including the `#tile-name` hash (default path: `/test/flp.html`) |
| `pages` | object | Map of accessor name (e.g., `onTheList`) to page object instance |
| `async` | boolean | Set to `true` for async OPA execution (required for OData V4) |

For full API documentation: `https://sapui5.hana.ondemand.com/#/api/sap.fe.test.JourneyRunner`

---

## Difference from Base OPA5 Skill

The `ui5-best-practices-opa5` base skill uses `Opa5.extendConfig({ autoWait: true, viewNamespace: "..." })` in `opaTests.qunit.js`. Fiori Elements apps replace this with `JourneyRunner` - do not set `autoWait` or `viewNamespace` manually, as the `JourneyRunner` handles test execution configuration for Fiori Elements internals.
