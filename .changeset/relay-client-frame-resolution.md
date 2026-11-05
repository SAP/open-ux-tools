---
"@sap-ux/preview-middleware": patch
---

FIX: the RTA relay client no longer silently targets the parent window when the editor frame is missing — it uses the current window only when running inside a frame, and throws a clear "frame not found" error in the top document (surfacing a load-order race instead of masking it as an RTA start failure).
