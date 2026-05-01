---
"@sap-ux/fiori-generator-shared": minor
"@sap-ux/fiori-app-sub-generator": minor
---

feat(fiori-app-sub-generator): support virtual endpoints in headless generator, defaulting to true

Added `enableVirtualEndpoints` option to `AppConfig` in `fiori-generator-shared`. When used in the headless generator, this defaults to `true`, causing virtual preview endpoints to be used instead of generating `flpSandbox.html` and related test files.
