---
'@sap-ux/fe-fpm-writer': patch
---

Fixed: Generation of custom extensions fails when the path to fpm-writer contains parentheses (e.g. myApp(1)), causing a `Trying to copy from a source that does not exist` error.
