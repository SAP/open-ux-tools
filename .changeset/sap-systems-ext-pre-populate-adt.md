---
"sap-ux-sap-systems-ext": minor
"@sap-ux/sap-systems-ext-webapp": minor
---

feat(sap-systems-ext): pre-populate connection manager panel when creating system from ADT (#37892)

When the Fiori generator is launched from ADT and the system is not already saved, the connection manager now opens with the URL, client and system type (ABAP On-Premise) pre-populated from the ADT request.
