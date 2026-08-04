---
'@sap-ux/create': minor
---

FIX: system management CLI improvements - smart URL lookup and credential display

**Test 14 - Smart URL Lookup:**
System commands (get, update, remove) now use smart URL matching when client parameter doesn't match exactly:
- If exact match found (URL + client), use it
- If no exact match, search all systems with the same URL
- If exactly one system found, use it automatically  
- If multiple systems found, prompt user to select which one
- Handles the common case where user forgets to specify client parameter

**Test 7 - Credentials Display:**
`get system` command now properly displays "No credentials stored" when system metadata exists but credentials are missing from keychain, instead of showing nothing.

Fixes Tests 7 and 14 from issue #39060
