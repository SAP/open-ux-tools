# ADP Editor Launcher

Automatically opens the adaptation editor with the built-in `simpleBrowser.show`
command. The **Fiori: Open ADP Editor in Simple Browser** command remains a manual
fallback: it reads the current valid open signal, or replays the latest open
observed during this activation when the file contains a close or is unreadable.
It never opens a URL taken only from a close signal.

## Optional BAS relay setup

Use this extension with the matching Fiori MCP server and relay-enabled
`@sap-ux/preview-middleware` used by the adaptation project; no relay patch to
`@sap-ux/adp-tooling` is needed. Set `SAP_FIORI_MCP_ADP_TOOLS=true` and
`SAP_FIORI_MCP_ADP_HTTP_TRANSPORT=true` in the MCP server environment. Relay credentials are generated internally, not
configured by the user. See the [MCP setup and architecture](../fiori-mcp-server/README.md#optional-adp-rta-in-bas-simple-browser).

For local changes, install the rebuilt extension, **restart MCP and reload the
BAS window**, then call `open_adaptation_editor`. Updating source or installing a
VSIX alone does not activate the updated workflow. MCP exposes the port using
`exposePort` and publishes the browser-reachable URL for automatic opening;
complete any interactive login in that page. HTTP relay calls require the exact
returned editor URL in the same MCP lifetime. After reconnecting, reopen through
MCP; the manual command cannot restore a lost editor session.

## Command protocol

One `watchFile` watcher polls `join(tmpdir(), 'sap-ux-adp-editor.json')` with
`interval: 1000`. Both commands use exactly this payload shape:
`{ command: 'open' | 'close', url: string, id: string }`. URLs and IDs must be
non-empty strings; extra fields are ignored. Legacy filenames and payloads are
not supported.

The writer must use the exact same browser-reachable URL for open and close, and
a unique opaque ID per request (for example, `crypto.randomUUID()`, not a
timestamp). IDs are not ordered. The existing valid ID is seeded at activation
to prevent replay; subsequently handled IDs are also ignored for the rest of
the activation. The fallback may explicitly replay an open. Malformed/missing
input is ignored without consuming its ID. Observed signals are captured before
queueing, and all open/close operations, including manual opens, execute serially.

The MCP writer must atomically rename a completed temporary file onto this same
path for both commands. This is a latest-command mailbox, not a durable queue:
commands replaced between polls can be missed, and there is no delivery
acknowledgement. Let the editor appear before stopping it; use the manual open
fallback if needed. Stop does not wait for the watcher or a browser stop sentinel.
Without ordered IDs, an unseen request cannot be classified as older merely
from its ID.

Each open replaces the ownership record with only the actual Simple Browser
`Tab` identified after `simpleBrowser.show`: a unique newly created Simple
Browser tab, or, if none was created, the active matching Simple Browser tab
(including a reused tab). Multiple new candidates or no matching active tab
leave ownership unset. A close closes only the tracked tab, if still present,
and only for its recorded exact URL; other tabs are never swept or matched by
title. Restored tabs remain unowned until identified by an explicit open.

**Ownership limitation:** VS Code's webview tab API does not expose the loaded
URL or return a tab from `simpleBrowser.show`. Attribution uses the before/after
snapshot and active tab when the command completes. If the host updates tabs
later or ownership is ambiguous, close the editor manually. Navigation within a
tracked webview is not observable through this API; URL matching uses the URL
of the last tracked open, not the live page URL.

**Integration dependency:** MCP's editor-session registry writes both commands
with the stored browser URL and owns editor-server termination. The mailbox
contains neither relay credentials nor process details. This extension only
manages its owned tab; it never discovers or kills processes by port. MCP stop
signals close and immediately begins terminating its owned child (the recorded
spawned process group on POSIX), independent of browser responsiveness. A closed
tab does not confirm server termination; check MCP's `editorServerStopped` result.
After activation on an existing close signal, no previous open URL is available
to the fallback until another open is observed.

## Validation

Run `pnpm run build`, `pnpm run lint`, `pnpm run check-types`, then `pnpm test`
from this package. Tests use Node's built-in test runner and execute the built
extension in a VM with mocked VS Code, file polling, and tabs; no extension
installation or editor restart is required for these unit tests. They do not
verify the installed extension or a live BAS editor session.
