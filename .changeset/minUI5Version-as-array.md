---
"@sap-ux/fe-fpm-writer": patch
"@sap-ux/odata-service-writer": patch
"@sap-ux/project-access": patch
"@sap-ux/ui5-application-writer": patch
"@sap-ux/ui5-proxy-middleware": patch
---

- Adjusts getMinUI5VersionAsArray so that semver valid check is included; the function now only returns valid versions.
- Upgrade of @ui5/manifest to 1.66.0; adjustment of all components so that minimumUI5Version definitions as array are processed properly.
