---
"@sap-ux/fiori-mcp-server": patch
---

FEAT: Add an opt-in, session-owned HTTP relay for the ADP RTA workflow in BAS Simple Browser, without a server-side browser.

Enable `SAP_FIORI_MCP_ADP_TOOLS=true` and `SAP_FIORI_MCP_ADP_HTTP_TRANSPORT=true`. The editor-session registry retains the exact local/browser URLs, generated relay credential, and spawned `ChildProcess`. A fresh 64-hex-character token is generated only for HTTP relay and passed privately to the child; it is not a user setting. Requests use Bearer authorization against the stored loopback URL, without reverse-parsing BAS hostnames. Relay calls require the exact URL returned by `open_adaptation_editor` in the same MCP lifetime; reopen after reconnecting.

Keep automatic opening through `exposePort` and the launcher extension, using one atomic `/tmp/sap-ux-adp-editor.json` mailbox (`tmpdir()` on other hosts) with `{ command, url, id }`. Stop signals close and immediately begins terminating only the owned process or recorded spawned POSIX group, without a browser stop sentinel or port-based process discovery. The launcher closes only its owned tab for the exact URL; ambiguous ownership leaves it open. Restart sends `__reload__`, then `__ready__`, and requires a different document `clientId`. The preview relay accepts at most one pending/in-flight command and rejects conflicting polls and duplicate results; edits are not automatically replayed.

Use relay-enabled preview middleware and the matching launcher; no relay patch to ADP tooling is required. Local builds require installing the rebuilt extension, restarting MCP, and reloading BAS before opening a new editor.
