---
"@sap-ux/project-access": patch
---

FIX: findCapProjectRoot now correctly starts search at the given path instead of its parent, so passing a CAP root directly returns it as expected
