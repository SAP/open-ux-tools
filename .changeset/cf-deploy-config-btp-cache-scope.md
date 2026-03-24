---
'@sap-ux/cf-deploy-config-writer': patch
---

refactor: scope BTP destinations cache to call site instead of module level

`getBTPDestinations` and `getDestinationProperties` now accept an optional
`cache` parameter (`{ list?: Destinations }`). Each generator run passes its own
cache object for deduplication within a single invocation; independent calls use
independent caches by default. This removes the module-level mutable variable
that caused cross-test contamination and prevented stale-cache detection.
