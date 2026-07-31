---
'@sap-ux/telemetry': patch
---

FIX: Revert applicationinsights 3.15.1 → 3.15.0. The 3.15.1 release updated @azure/monitor-opentelemetry-exporter to a version that ships a nested @opentelemetry/api@0.10.2, which depends on @opentelemetry/context-base — a package that no longer exists (absorbed into @opentelemetry/api in v0.12). This breaks esbuild bundling in downstream consumers (e.g. @sap/ux-ui5-tooling) because esbuild resolves imports statically and cannot find the missing package.
