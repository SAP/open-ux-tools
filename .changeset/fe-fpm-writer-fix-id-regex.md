---
"@sap-ux/fe-fpm-writer": patch
---

FIX: Replace \\bid regex boundary with negative lookbehind in isElementIdAvailable to prevent false positives on compound attributes like data-id
