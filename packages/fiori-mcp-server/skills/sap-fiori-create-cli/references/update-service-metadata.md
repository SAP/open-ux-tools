# update service-metadata — Full Workflow

Runs `update service-metadata` (see CLI reference in SKILL.md) to refresh the local `metadata.xml` and value-help service metadata from the live backend for a SAP Fiori application.

## Prerequisites (hard errors - must be resolved before running)

If the command fails with any of the following errors, stop and explain what the user must fix first - do NOT try to auto-fix these:

- **"Update service-metadata is only supported for Fiori applications connected to an EDMX backend"** — the app is a CAP application. This command does not apply: CAP service metadata is generated locally from the CDS model (via `cds compile`), not fetched from a backend. Do NOT attempt to work around this; there is nothing to refresh for CAP apps.
- **"No backend configuration found in ui5.yaml"** — the app's `ui5.yaml` has no `fiori-tools-proxy` middleware with a backend entry. The user must add a backend configuration pointing to their ABAP system.
- **"No stored system found"** (VSCode only) — the backend URL is not stored in the secure store. Run `npx @sap-ux/create@latest add system` first.
- **"No destination found in 'ui5.yaml'"** (SAP Business Application Studio only) — `ui5.yaml` has no `destination` under the backend config. The user must add a BTP destination name.
- **"No OData service found in manifest"** — the app's `manifest.json` has no `sap.app.dataSources` entries. The app may not be a standard Fiori elements app.
- **"Service '...' has no URI defined in manifest"** — the data source entry exists but is missing its URI. The manifest is malformed.

## Steps

### 1. Determine the target path

If the user specified a project path, use it as-is (relative or absolute — the CLI resolves it). Otherwise use the current working directory. Ask if unclear.

### 2. Ask about options if not already specified

Ask the user (can combine into one message):
- **Simulate first?** (`--simulate` does a dry run showing what would change without writing files). Recommend yes for first run.
- **Skip value-help metadata?** (`--no-value-help` skips fetching external/value-help service metadata). Only suggest this if the user mentions they only need the main service or if the backend doesn't support it.

If the user just says "go ahead" or "refresh it", run with `--simulate` first as a safe default.

### 3. Run the command

Use the invocation from SKILL.md. Capture the full stdout+stderr output.

### 4. Check the output

**On success**, the output will contain:
- `Fetching metadata for service '...'...` — confirms connection to backend
- `Fetching N external service(s)...` — confirms value-help fetch (if applicable)
- `File '...metadata.xml' modified` (or `added`) — main metadata written
- `Metadata updated.` — final confirmation

**Warning to watch for:**
- `Could not fetch external service metadata: ...` — the backend responded but external services failed (non-ABAP destination, or backend doesn't support value-help references). The main metadata was still updated. Inform the user and suggest `--no-value-help` for future runs if they don't need value-help.

### 5. Handle a simulation result

If `--simulate` was used:
- Show the user which files would be changed
- Ask whether to apply (run again without `--simulate`)
- If the user confirms, run the command without `--simulate`

### 6. Report results

After a real (non-simulate) run, give a clear summary:
- Which files were updated (`metadata.xml`, value-help XMLs if any)
- Whether external services were fetched
- Suggest rebuilding/restarting the local preview if it was running: `npm run start` or the app-specific `npm run watch-*` script

## Common error messages and fixes

| Error message | Cause | Fix |
|---|---|---|
| `Update service-metadata is only supported for Fiori applications connected to an EDMX backend` | App is a CAP project | Not applicable — CAP metadata is generated locally from the CDS model, not fetched from a backend |
| `No stored system found for URL '...'` | System not in secure store | Run `npx @sap-ux/create@latest add system` |
| `No destination found in 'ui5.yaml'` | BAS deployment without destination | Add `destination: MY_DEST` to backend config in `ui5.yaml` |
| `No backend configuration found in ui5.yaml` | Missing fiori-tools-proxy backend | Add backend entry to `ui5.yaml` |
| `Network error` / `ECONNREFUSED` | Backend unreachable | Check VPN, system URL, and credentials |
| `401 Unauthorized` | Wrong or expired credentials | Re-run `add system` to update stored credentials |

## Example output summary

```
Metadata refreshed.

Files updated:
- webapp/localService/metadata.xml — modified (fetched from /sap/opu/odata/sap/ZTEST_SRV/)
- webapp/localService/ZVAL_HELP_SRV/metadata.xml — modified (value-help service)

Next steps: Restart the preview to pick up the new metadata.
```
