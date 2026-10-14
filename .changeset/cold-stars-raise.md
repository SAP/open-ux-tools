---
'@sap-ux/serve-static-middleware': patch
---

fix: additionally serve paths that start with '/resources' w/o the '/resources' part (e.g. /resources/my/lib -> /my/lib) to ensure backward compatibility for the changed default value of 'flp.libs' parameter (was 'false' now is 'true') of preview-middleware  

