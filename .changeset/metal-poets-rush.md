---
'@sap-ux/axios-extension': minor
---

Instead of returning empty array, `TransportChecksService.getTransportRequests()` now throws a specific error if input package is a local package. Consumer can check if 
the error message string equals `TransportChecksService.LocalPackageError`. This fix is to correctly identify
local package because non-local package that is not associated with any transport request can also return emtpy array.
