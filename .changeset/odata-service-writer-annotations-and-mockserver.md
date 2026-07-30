---
"@sap-ux/odata-service-writer": patch
---

FIX: Do not delete existing remote annotation files/dataSources on update when annotations are not provided, and regenerate the sap-fe-mockserver middleware in ui5-mock.yaml when external (value-help) services are written (even when backend proxy middlewares are preserved) so the written external service metadata is resolved by the mockserver.
