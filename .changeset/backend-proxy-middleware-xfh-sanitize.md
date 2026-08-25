---
"@sap-ux/backend-proxy-middleware": patch
---

FIX: Remove x-forwarded-host from requests forwarded to BAS destination service

Addresses two related bugs that both cause HTTP 500 "Illegal character in authority" in BAS jp10:

1. When BAS ingress injects a comma-joined x-forwarded-host (e.g. `workspace, dest.dest`), strip to the first value before forwarding (original fix).
2. When BAS ingress delivers a clean single-value x-forwarded-host, BAS's internal Java destination proxy appends the destination host to it (comma-separated) when building its "support tenant name header", producing an invalid URI authority. Fix: unconditionally remove x-forwarded-host from the outgoing proxy request when running in BAS.
