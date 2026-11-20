---
'@sap-ux/fiori-migration-writer': minor
---

FEAT: add error codes to Message interface for GDPR-compliant telemetry. Each error message can now include a structured `code` field (e.g., 'ENOENT', 'UNSUPPORTED_FLOORPLAN', 'MANIFEST_PARSE_ERROR') that can be safely reported in telemetry without exposing PII. The `extractErrorCode()` utility extracts codes from Error objects using a priority system: error.name → error.code → message pattern matching → recursive error.cause inspection.
