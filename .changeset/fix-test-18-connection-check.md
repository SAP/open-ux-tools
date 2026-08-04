---
'@sap-ux/create': patch
---

FIX: implement real connection check for add system command

Replace stub with actual HTTP connection test to backend systems. Tests basic auth credentials against /sap/bc/ping with 5s timeout. Handles 401, timeout, and connection errors with appropriate prompts.

Fixes Test 18 from issue #39060
