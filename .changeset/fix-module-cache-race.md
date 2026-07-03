---
"@sap-ux/project-access": patch
---

fix(project-access): serialize concurrent module-cache installs and bust ESM import cache on retry

Parallel callers of `getModule()` (e.g. Jest workers) shared the on-disk module cache and could each run `npm install` against the same target directory, leaving partially written `package.json` files that other workers then imported. Combined with Node's ESM loader permanently caching failed import URLs, this surfaced as flaky test runs that could not self-recover.

`getModule()` now acquires a cross-process file lock (`proper-lockfile`) on the cache directory before checking for a completed install, and the retry path passes a cache-buster query string to `loadModuleFromProject()` so the freshly reinstalled module is imported with a new URL instead of the rejected one.
