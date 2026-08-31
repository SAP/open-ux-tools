# fiori-mcp-server — ADP Tooling PR TODO

Tracks productization work for the ADP tools added in PR #5107.  
**Delete this file before merging.**

Owners: `tools` = devs on tools/architecture; `skill` = skill-focused dev.  
Tests: adjust broken existing tests as you go — no new tests for now.

---

## Legend

- `[ ]` pending
- `[x]` done
- `~~strikethrough~~` won't fix / out of scope

Each task has an `_Owner:` line (track) and an `_Assignee:` line (person). Fill in your name when you pick up a task.

---

## 🔴 Bugs — fix first, blocking correctness

- [x] **`get-adp-odata-metada.ts` — `Array.from(metadataMap.values())` crashes at runtime**  
  Fixed — `read-odata-metadata.ts` now returns the array directly.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`get-adp-odata-metada.ts` — filename typo (missing trailing `a` in "metadata")**  
  Fixed — file is now `src/tools/read-odata-metadata.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`generate-adaptation-project.ts:130` — generator spawned with wrong `cwd`**  
  `runCmdArgs('npx', [...], { cwd: process.cwd() })` runs the Yeoman generator in the MCP server's process directory instead of `finalTargetFolder`. Fix: `cwd: finalTargetFolder`.  
  _File:_ `src/tools/generate-adaptation-project.ts:130`  
  _Owner: tools_ | _Assignee: —_

- [x] **`stop` step — registered page not closed before `stopBrowser()` on last session**  
  When stopping the last session, `sessions.delete(id)` is called then `defaultTransport.stopBrowser()`. The session's page may not be in `connectionRegistry` if `page.on('close')` already cleaned it up, causing a page handle leak. Fix: capture `session` in the `stop` case and call `defaultTransport.disconnectSite(session.site)` before `stopBrowser()`, mirroring the `restart` pattern.  
  _File:_ `src/tools/run-rta-workflow-step/index.ts:114`  
  _Owner: tools_ | _Assignee: —_

- [x] **`generate-adaptation-project.ts` — shell-injection vulnerability via template-string command (verify fix is complete)**  
  The original code used a shell-interpolated string. Confirm the final code passes all arguments as an array element to `spawn` with `shell: false`, never as an interpolated string. Verify no user-supplied value (`system`, `application`, `namespace`, etc.) can escape into shell.  
  _File:_ `src/tools/generate-adaptation-project.ts`  
  _Owner: tools_ | _Assignee: —_

- [x] **`server.ts` SIGINT handler — `sessions` map not cleared when browser is stopped**  
  `stopBrowser()` clears `connectionRegistry` but the `sessions` Map in `run-rta-workflow-step/index.ts` is never touched. Session IDs remain as dangling entries after a browser stop. Fix: export `clearSessions()` from `index.ts` and call it alongside `stopBrowser()` in the SIGINT handler in `server.ts`.  
  _File:_ `src/server.ts`, `src/tools/run-rta-workflow-step/index.ts`  
  _Owner: tools_ | _Assignee: —_

- [x] **`open-adaptation-editor.ts` — `setInterval` polling instead of direct `resolve()` calls**  
  Already fixed — current code calls `resolve()` directly from event handlers.  
  _File:_ `src/tools/open-adaptation-editor.ts`  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`open-adaptation-editor.ts` — hardcoded 1-second blind delay after successful URL detection**  
  Already fixed — no unconditional delay present in current code.  
  _File:_ `src/tools/open-adaptation-editor.ts`  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`adp-controller-extension/output.ts` — status casing inconsistency**  
  Every other tool uses `'Success'` / `'Error'` (title-case). `adp-controller-extension` uses lowercase `'success'` / `'error'` / `'info'` / `'skipped'`. Align to title-case: `'Success'` / `'Error'` / `'Info'` / `'Skipped'`.  
  _File:_ `src/tools/adp-controller-extension/output.ts`  
  _Owner: tools_ | _Assignee: —_

- [x] **Two test files deleted without explanation — restore or justify**  
  `test/unit/tools/generate-fiori-app-cap-impl.test.ts` and `test/unit/tools/generate-fiori-app-odata-impl.test.ts` were removed in this PR. Restore them if deleted by mistake, or document why they were removed and confirm coverage is maintained elsewhere.  
  _Owner: tools_ | _Assignee: —_ Nikita

---

## 🟠 Architecture

- [x] **`run_rta_workflow_step` — browser singleton is in-process memory; MCP protocol is stateless per-request**  
  Resolved by redesign: `sessionId` (server-side state) replaced by `site` + `frameId` passed on every call. The browser page cache in `connectionRegistry` (keyed by URL) is the only long-lived state. No sessions map, no SESSION_LOST scenario.  
  _Owner: tools (server guard) + skill (SKILL.md update)_ | _Assignee: —_ Ivo (to find the POC PR)

- [x] **`generate_adaptation_project` — stability hardening (contact Stefan for more info)**  
  Tool is reported as flaky for some users. Multiple independent failure modes:

  - ~~**Password leaked in tool response** — `parameters: params` echoes plaintext `password` and `username` back in both success and error envelopes. Strip sensitive fields before echoing.~~ ✓  
    _File:_ `src/tools/generate-adaptation-project.ts:143,157`

  - ~~**`npx -y yo@4` re-downloads Yeoman on cold/corporate networks** — fails on offline/air-gapped machines and corporate proxies. Check whether `yo` is already available globally before falling back to `npx -y`. Also pin `@sap-ux/adp` to a specific version to avoid version drift.   ✓~~
    _File:_ `src/tools/generate-adaptation-project.ts:129`

  - ~~**Generator failure gives no actionable output** — on non-zero exit, `stdout` is discarded. Yeoman prints useful failure info to `stdout`. Include both `stdout` and `stderr` in the error message.~~ ✓  
    _File:_ `src/tools/generate-adaptation-project.ts:149–158`

  - ~~**`SIGTERM` on timeout has no `SIGKILL` follow-up on Unix** — `SIGTERM` can be ignored. Add a `SIGKILL` after a 5-second grace period if the child hasn't exited.   ✓~~
    _File:_ `src/utils/utils.ts:89–96`

  - ~~**`targetFolder` not validated as absolute path** — if the AI passes a relative path, files are written relative to `process.cwd()`. Validate that `finalTargetFolder` is absolute before calling `mkdir`.~~ ✓  
    _File:_ `src/tools/generate-adaptation-project.ts:71`

  - ~~**`getDefaultProjectName` index skip** — `app.variant` → `app.variant2` is the canonical convention in `generator-adp` (`packages/generator-adp/src/app/questions/helper/default-values.ts`). No `app.variant1` by design. No change needed.~~

  - ~~**`importKeyUserChanges` contract mismatch** — code warns and continues when `getKeyUserData` returns empty array; PR description says it should abort. Decide and align code + SKILL.md.~~ ✓  
    _File:_ `src/tools/generate-adaptation-project.ts:~108`

  _Owner: tools (code) + skill (SKILL.md for importKeyUserChanges)_ | _Assignee: —_

- [ ] **Decide and implement: promote `lookup-aggregation.mjs` to a first-class MCP tool**  
  Currently the skill instructs the AI to call `node ~/.claude/skills/…/lookup-aggregation.mjs` via the `Bash` tool. This requires `Bash` access (not available in pure MCP clients) and forces the AI to parse raw stdout.

  **Options:**
  - **A (recommended): New standalone MCP tool `get_aggregation_metadata(library, control, aggregation, ui5Url?, version?)`** — returns structured JSON, caches under `~/.cache/adp-aggregation-lookup/`. SKILL.md step 6 replaces the bash call with a tool call. The `.mjs` script stays as a dev/CLI convenience.
  - **B: Step in `run_rta_workflow_step`** — doesn't fit; aggregation lookup is a static HTTP fetch, not browser automation.
  - **C: Keep as shell script** — fragile, not portable.

  **Decision needed:** confirm option A, assign implementation.  
  _Owner: tools_ | _Assignee: —_ Mihail

---

## 🟡 Code quality

- [x] **`open-adaptation-editor.ts` — 220-line function, split into helpers**  
  The function does four things in sequence. Extract:
  - `resolveFioriBin(appPath, isWindows): { command, args }`
  - `waitForEditorUrl(childProcess, timeoutMs): Promise<{ serverUrl, editorPath }>`
  - `parsePort(url): number | undefined`
  - `buildKillInstructions(pid, port, isWindows): string`  
  _File:_ `src/tools/open-adaptation-editor.ts`  
  _Owner: tools_ | _Assignee: Nikita_

- [x] **`open-adaptation-editor.ts` — stderr piped to `'ignore'`**  
  Change `stdio: ['ignore', 'pipe', 'ignore']` to capture stderr and include it in the timeout/error message.  
  _File:_ `src/tools/open-adaptation-editor.ts:46`  
  _Owner: tools_ | _Assignee: Nikita_

- [ ] **`list-odata-services.ts` — `isS4Cloud` setting needs investigation**  
  `catalogV2.isS4Cloud = Promise.resolve(true)` sets a public property on the catalog base class (designed to be set). The question is whether forcing `true` is correct (adaptation projects are S4Cloud-only) or whether it should be detected dynamically via `provider.isAbapCloud()`. Investigate and align with how other tools in the codebase determine S4Cloud status.  
  _File:_ `src/tools/list-odata-services.ts`  
  _Owner: tools_ | _Assignee: —_

- [x] **`build-dev` script bypasses `bundle.mjs` — plugins not applied in dev builds**  
  Restored to `NODE_ENV=development node scripts/bundle.mjs`. The `bundle.mjs` already handles `NODE_ENV=development` by enabling `sourcemap: 'linked'`.  
  _File:_ `package.json:34`  
  _Owner: tools_ | _Assignee: Nikita_

- ~~**`prettify-xml` and `adm-zip` are `devDependencies` but used in production `src/`**  
  Package is fully bundled via esbuild; devDependencies are inlined into the bundle at build time. Not applicable.~~

- [x] **`parser.ts` — path marker on same line as fence open is silently dropped**  
  Fixed — after matching `PATH_MARKER`, the remainder of the line is now checked for a fence-open pattern.  
  _File:_ `src/tools/adp-controller-extension/ai-response/parser.ts:22`  
  _Owner: tools_ | _Assignee: Nikita_

- [x] **`parser.ts` — no log when `aiResponse` has zero code blocks**  
  Fixed — `processor.ts` now logs a warning when `extractFilesFromResponse` returns an empty array.  
  _File:_ `src/tools/adp-controller-extension/ai-response/processor.ts:35`  
  _Owner: tools_ | _Assignee: Nikita_

---

## 🟡 Type safety

- [x] **`readODataMetadataAdp` return type is `Promise<Array<any>>`**  
  Fixed — now `Promise<ODataMetadataEntry[]>` in `src/tools/read-odata-metadata.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`listLibrariesFromSystem` return type is `Promise<Array<object>>`**  
  Fixed — now `Promise<Partial<App>[]>` in `src/tools/list-libraries.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`listODataServices` return type is `Promise<Array<object>>`**  
  Fixed — now `Promise<ODataServiceInfo[]>` in `src/tools/list-odata-services.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`systemPath` type not exported from `manifestContext.ts`**  
  Resolved by refactor — `SystemPath` is now private inside `src/tools/services/abap-context.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

---

## 🟡 Technical debt — duplicate code that should reuse `@sap-ux/adp-tooling` - Nikita

Per `AGENTS.md`: always reuse existing functions from common libraries. `manifestContext.ts` reimplements patterns already in `@sap-ux/adp-tooling`.

- [x] **`getProvider(appPath)` — kept in `services/abap-context.ts`  
  `getConfiguredProvider` from `adp-tooling` resolves by system name via store/BAS — not compatible with `ui5.yaml`-sourced targets. `getProvider` kept as shared infrastructure in `src/tools/services/abap-context.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [ ] **`getDefaultProjectName` — consolidate with `generator-adp` canonical implementation**  
  Both `fiori-mcp-server` and `generator-adp` have identical `getDefaultProjectName` implementations. The one in `generator-adp` is not exported from its public index. Either export it from `generator-adp` and import it here, or move to a shared package (e.g. `@sap-ux/adp-tooling`).  
  _Files:_ `src/tools/generate-adaptation-project.ts`, `packages/generator-adp/src/app/questions/helper/default-values.ts`  
  _Owner: tools_ | _Assignee: —_

- [x] **`readMergedManifest(appPath)` — replaced with `ManifestService.initMergedManifest` from `adp-tooling`**  
  Done in `src/tools/read-odata-metadata.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [x] **`readManifest(appPath)` — replaced with `getVariant` from `adp-tooling`**  
  Done in `src/tools/read-odata-metadata.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

---

## 🔵 SKILL.md — skill dev track (parallel)

- [ ] **`adp-controller-extension-flow/SKILL.md` — split 511-line file**  
  Split into: `SKILL.md` (core workflow, steps 1–14, tool contract, error table, example — target ~300 lines) and `references/hitl-gating.md` (confidence rubric, per-decision thresholds, namespace rules, HITL gating — ~130 lines). Workflow steps reference the rubric by section title.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **Both SKILL.md files — `kill` command is Unix-only (`lsof` doesn't exist on Windows)**  
  Both files document `lsof -ti:<port> | xargs kill`. Mirror the platform split already in `buildKillInstructions()`: `taskkill /PID … /F` on Windows, `kill $(lsof -ti:<port>)` on Mac/Linux.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **Both SKILL.md files — frontmatter `author`/`version` must be nested under `metadata:`**  
  ```yaml
  metadata:
    author: sap-fiori-tools
    version: 0.0.1
  ```  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **SKILL.md — prerequisite `fiori-mcp-server` not documented**  
  Add a **Prerequisites** section naming `@sap-ux/fiori-mcp-server`, explaining it must be running as an MCP server, and linking to install instructions. Without this, users installing via `npx skills add <url>` get no useful error.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — skill description doesn't match user trigger phrases**  
  Replace "Use when making RTA changes…" with:  
  > "Use when the user wants to make UI changes to a SAP Fiori adaptation project via the adaptation editor — adding buttons, fields, columns, or sections, changing labels or properties, hiding controls, or extending controllers with custom logic. Trigger on phrases like 'add a button', 'hide a field', 'add a column', 'customize the toolbar', or 'extend the controller' when working in an adaptation project context."  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — actions table framing is misleading**  
  Reframe as: "these are the two actions this skill is authoritative about — if `actionsCatalog` contains other ids, surface them to the user rather than picking."  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — tool reference namespace inconsistent**  
  Tool contract uses bare `run_rta_workflow_step` but Step 11 uses `mcp__fiori-mcp__adp_controller_extension`. Pick one form throughout.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` step 11 — no error path if Phase 1 fails**  
  Add to Error Handling table: `adp_controller_extension Phase 1 fails` → surface the error, stop, ask the user to verify `appPath` points to an adaptation project root.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- ~~**SKILL.md — document `SESSION_LOST` error and recovery flow**  
  No longer applicable — `sessionId` and the sessions map were removed. `site` + `frameId` are passed on every call instead.~~  
  _Owner: skill (after tools adds the guard)_ | _Assignee: —_

- ~~**SKILL.md — sessionId carry-forward guidance**  
  No longer applicable — replaced by `site` + `frameId` carried on every call. SKILL.md updated as part of the redesign.~~  
  _Owner: skill_ | _Assignee: —_

- [ ] **SKILL.md — `importKeyUserChanges` empty-result behavior**  
  After the code behavior is decided (see Architecture above), update `adp-controller-extension-flow/SKILL.md` accordingly.  
  _Owner: skill_ | _Assignee: —_

---

## 🔵 Housekeeping

- [x] **Export `ODataMetadataEntry` from `read-odata-metadata.ts`**  
  `ODataMetadataEntry` is now exported from `src/tools/read-odata-metadata.ts`.  
  _Owner: tools_ | _Assignee: —_ Nikita

- [ ] **Changeset message doesn't mention the new skills**  
  Update `.changeset/fiori-mcp-server-adp-tools.md` to mention the two new SKILL.md files and `lookup-aggregation.mjs`.  
  _File:_ `.changeset/fiori-mcp-server-adp-tools.md`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`skills/` in `package.json` `files` — confirm intentional and document**  
  Add a note in `package.json` or `README.md` explaining that `skills/` is published intentionally for Claude Code users.  
  _Owner: tools_ | _Assignee: —_

- [ ] **Delete this file before merging the PR**  
  _Owner: whoever merges_ | _Assignee: —_
