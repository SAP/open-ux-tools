---
'@sap-ux/create': patch
---

FIX: system management CLI improvements - smart URL lookup and credential display

Implements smart URL matching for get/update/remove commands when client parameter doesn't match exactly. Shows "No credentials stored" message when system metadata exists but credentials are missing.

Fixes Tests 7 and 14 from issue #39060
