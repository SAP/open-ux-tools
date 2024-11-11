---
'@sap-ux/ui-components': patch
---

Fix UITreeDropdown change callback being triggered twice on first selection:
1. First call with empty value
2. Second call with selected value
