---
'@sap-ux/create': minor
---

fix(create): improve system management CLI auth prompts and add clear credentials option

- Make username/password prompts conditional on authenticationType - only prompt when auth type is 'basic'
- Add informational message for reentranceTicket authentication about browser tab
- Add "Clear Credentials" option to update system multiselect with confirmation prompt
- Add consistent "System was not added/updated" confirmation messages on all failure paths
- Update tests to match new behavior (all tests passing)

Fixes Test 5, Test 8, and Test 15 from issue #39060
