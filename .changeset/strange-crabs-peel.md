---
'@sap-ux/deploy-input-validator': minor
'@sap-ux/axios-extension': minor
'@sap-ux/deploy-tooling': patch
---

`@sap-ux/axios-extension`:

Instead of returning empty array, `TransportChecksService.getTransportRequests()` now throws a specific error if input package is a local package. Consumer can check if 
the error message string equals `TransportChecksService.LocalPackageError`. This fix is to correctly identify
local package because non-local package that is not associated with any transport request can also return emtpy array.

`@sap-ux/deploy-tooling`: 

A new feature is introduced to run validators on deploy configuration in `ui5-deploy.yaml` and returns found issues. This new feature is only activated when running deploy in the existing `test` mode. No additional parameter required to include this validation process.

`@sap-ux/deploy-input-validator`:

A new module that includes validator utility functions for deploy configuration inputs. Please refer to the
unit test file in `deploy-input-validator/test/validators.test.ts` for use cases.

