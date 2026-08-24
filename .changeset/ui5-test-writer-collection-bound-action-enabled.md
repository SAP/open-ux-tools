---
"@sap-ux/ui5-test-writer": patch
---

FIX: Collection-bound table/section actions are now generated as enabled by default (`enabled: true`) again. A previous change treated every bound action as requiring a row selection, which incorrectly disabled collection-bound actions (e.g. mass/create-style actions) that the SAP FE runtime renders enabled without a selection. Single-instance-bound actions remain disabled by default. Bound actions of both kinds keep `unbound: false`.
