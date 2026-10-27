---
"@sap-ux/fiori-mcp-server": patch
---

FIX: Make the Cloud Foundry adaptation-editor RTA start flow reliable for interactive login.

- `run_rta_workflow_step` (`start`/`restart`): when the editor serves a backend login page, the headed browser window is now kept open and the step polls for login completion (bounded by `PLAYWRIGHT_LOGIN_WAIT_MS`, default 120s) instead of closing the window immediately. A completed login continues on the same call; only a timeout returns the `backend_login_required` signal (so the user can log in and retry).
- The webclient-bridge probe is now frame-aware — it looks inside the editor's `preview` iframe where the app runs, not just the top page — so login completion is actually detected.
- Before running `startRTA`, the step now waits for the editor's own `app-loaded` readiness signal (bounded by `PLAYWRIGHT_APP_LOADED_WAIT_MS`, default 60s) so the action is not invoked against a half-booted RuntimeAuthoring (previously surfaced as a `componentInstance`/`attachEventOnce` TypeError). Applies to ABAP and CF; a timeout falls through to the existing per-action bridge wait.
- A dead editor (HTTP >= 400) now fails fast with an actionable message instead of waiting out the full timeouts.
- The per-project CF session map now survives a browser disconnect (e.g. the human closing the window) and an explicit `stop`, and is released only when the process exits — so a second `start` for the same project reuses the login rather than re-prompting.
