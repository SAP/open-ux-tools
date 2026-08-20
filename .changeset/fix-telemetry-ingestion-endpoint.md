---
"@sap-ux/telemetry": major
---

FEAT: Add configurable IngestionEndpoint/LiveEndpoint and bump applicationinsights 3.15.1 → 3.16.0

BREAKING CHANGE: The connection string now always includes explicit IngestionEndpoint/LiveEndpoint values (defaulting to the westus2 region) instead of a bare InstrumentationKey. This is required because the @azure/monitor-opentelemetry-exporter (>= 1.0.0-beta.44, pulled in by applicationinsights 3.16.0) refuses to follow the global endpoint's cross-origin redirect to the regional endpoint, which silently dropped all telemetry. Consumers whose Azure App Insights resource is not in the westus2 region MUST now supply the new `ingestionEndpoint` and `liveEndpoint` options to `initTelemetrySettings` to route telemetry to the correct regional endpoint.

FIX: Restore GDPR masking of cloud role, IP, and location broken by applicationinsights v2 → v3 upgrade
