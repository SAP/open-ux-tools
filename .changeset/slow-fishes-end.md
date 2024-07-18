---
'@sap-ux/project-access': major
---

Caching promise to load global cds module:
- When loading the global installed cds module is required, we call `cds --version` to locate the path to load from. As this call is quite expensive, so far, after the result was retrieved, the path was cached. Now, we already cache the promise waiting for the result and resolving to the loaded module.
- When `loadGlobalCdsModule` was called a second time before the first execution was finished, by this, we can avoid a useless second expensive call to `cds --version`.
- If your code is calling `loadGlobalCdsModule` (or any method using it) several times, you could possibly have observed sequential execution being faster than parallel execution. In that case you should consider to gain performance by changing to parallel execution now.
