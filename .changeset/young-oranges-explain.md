---
'@sap-ux/deploy-tooling': patch
---

Capitalize $tmp before performing any validations. ADT queries rejects package name that is not in capital letter.
The previous fix only caplitalize for list package query. But ADT query for valid transport requests also require
caplized capital letters to detect $TMP is local package.
