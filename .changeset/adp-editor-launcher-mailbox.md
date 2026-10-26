---
"sap-ux-adp-editor-launcher-ext": patch
---

FEAT: Open and close the BAS adaptation editor through one atomic command mailbox with ownership-safe Simple Browser tab handling.

Watch `/tmp/sap-ux-adp-editor.json` (`tmpdir()` on other hosts) for `{ command: 'open' | 'close', url, id }`, deduplicate opaque IDs, and serialize automatic and manual requests. Preserve automatic opening of the URL exposed by MCP and the **Fiori: Open ADP Editor in Simple Browser** fallback. Close only the tab attributed to the latest open for that exact URL; ambiguous ownership never closes unrelated tabs. This replaces the legacy two-file protocol; the launcher neither handles relay credentials nor discovers or kills processes by port.

Use the matching MCP and preview middleware builds. After installing the rebuilt extension, restart MCP and reload BAS before opening a fresh editor; the manual fallback does not restore a session lost across MCP reconnects.