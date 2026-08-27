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

- [ ] **`get-adp-odata-metada.ts` — `Array.from(metadataMap.values())` crashes at runtime**  
  `readAnnotationfromManifest` already returns `ODataMetadataEntry[]` (not a `Map`). Calling `.values()` on an array throws `TypeError: metadataMap.values is not a function`. Fix: remove `Array.from(…).values()` and return the array directly.  
  _File:_ `src/tools/get-adp-odata-metada.ts:11`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`get-adp-odata-metada.ts` — filename typo (missing trailing `a` in "metadata")**  
  File is `get-adp-odata-metada.ts`, export is `readODataMetadataAdp`, MCP tool is `read_odata_metadata_adp`. Rename the file to `get-adp-odata-metadata.ts` and update the import in `src/tools/index.ts`.  
  _Owner: tools_ | _Assignee: —_

- [ ] **`generate-adaptation-project.ts:130` — generator spawned with wrong `cwd`**  
  `runCmdArgs('npx', [...], { cwd: process.cwd() })` runs the Yeoman generator in the MCP server's process directory instead of `finalTargetFolder`. The generator resolves local `node_modules` from `cwd`, so on any machine where these differ the generation either fails or produces files in the wrong location. Fix: `cwd: finalTargetFolder`.  
  _File:_ `src/tools/generate-adaptation-project.ts:130`  
  _Owner: tools_ | _Assignee: —_

---

## 🟠 Architecture / stateful browser across MCP calls

- [ ] **`run_rta_workflow_step` — browser singleton is in-process memory; MCP protocol is stateless per-request**  
  The `sessions` map and the Playwright browser singleton live in Node module scope (`playwright-bridge.ts`). This works when the MCP server process stays alive (the common case for Claude Desktop / VS Code extension). However, if the server restarts between steps — or if a future deployment runs the MCP server as a stateless function — all session state is lost and every `sessionId` becomes stale.  
  
  **Agreed mitigation (no full rewrite):** update the `adp-controller-extension-flow` SKILL.md to:
  1. Instruct the AI to treat the `sessionId` as an opaque token it must carry forward through every step in a single conversation turn.
  2. Document that `Unknown sessionId` errors almost always mean the server restarted — the recovery is to call `start` again and obtain a new session.
  3. Add a server-side guard: if the `sessions` map is empty when any non-`start` step is called, return a structured `{ error: "SESSION_LOST", hint: "Server was restarted. Call start again." }` instead of a generic thrown error, so the skill can detect and handle it cleanly.  
  
  _Owner: tools (server guard) + skill (SKILL.md update)_ | _Assignee: —_

- [ ] **`stop` step — registered page not closed before `stopBrowser()` on last session**  
  In `run-rta-workflow-step/index.ts:114–120`, when stopping the last session the code calls `sessions.delete(id)` then `defaultTransport.stopBrowser()`. The `stopBrowser()` function in `playwright-bridge.ts` iterates `connectionRegistry` and closes pages, but the session's page may not be registered there if its `site` key was already cleaned up via the `page.on('close')` event. In that case a page handle leak is possible. Fix: explicitly call `defaultTransport.disconnectSite(session.site)` before `stopBrowser()`, mirroring the `restart` step pattern.  
  _File:_ `src/tools/run-rta-workflow-step/index.ts:114`  
  _Owner: tools_ | _Assignee: —_

---

## 🟡 Type safety — `any` / `object` in public surfaces

- [ ] **`readODataMetadataAdp` return type is `Promise<Array<any>>`**  
  `ODataMetadataEntry` is defined in `manifestContext.ts` but not exported. Export it from there and change the return type of `readODataMetadataAdp` to `Promise<ODataMetadataEntry[]>`.  
  _Files:_ `src/tools/functionalities/manifest-changes/manifestContext.ts`, `src/tools/get-adp-odata-metadata.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`listLibrariesFromSystem` return type is `Promise<Array<object>>`**  
  The library entries returned by `appIndex.search()` have a known shape from `@sap-ux/axios-extension`. Define or import the correct type and replace `Array<object>`.  
  _File:_ `src/tools/get-libraries.ts:10`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`listODataServices` return type is `Promise<Array<object>>`**  
  `getAvailableODataServices` already returns `Promise<Array<ODataServiceInfo>>` — the type is defined in `@sap-ux/axios-extension` and already imported in `manifestContext.ts`. Propagate it to `get-odata-services.ts`.  
  _File:_ `src/tools/get-odata-services.ts:10`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`systemPath` type in `manifestContext.ts` is not exported**  
  It is used implicitly through `getSystemUrl` but not accessible to callers that might want to reference the shape. Export it (rename to `PascalCase`: `SystemPath`).  
  _File:_ `src/tools/functionalities/manifest-changes/manifestContext.ts:13`  
  _Owner: tools_ | _Assignee: —_

---

## 🟡 Code structure — `open-adaptation-editor.ts` (220 lines, too much in one function)

- [ ] **Split `openAdaptationEditor` into focused helpers**  
  The 220-line function does four separate things: (1) resolves the binary path, (2) spawns the process and extracts the URL via readline, (3) parses the port from the URL, (4) builds the kill-command strings for the response message. Each should be its own named helper so the orchestrator function reads as a linear sequence of steps.  
  Proposed split:
  - `resolveFioriBin(appPath, isWindows): { command, args }` — binary resolution logic (lines 26–38)
  - `waitForEditorUrl(childProcess, timeoutMs): Promise<{ serverUrl, editorPath }>` — the readline/timeout promise (lines 49–111)
  - `parsePort(url): number | undefined` — URL → port (lines 149–159)
  - `buildKillInstructions(pid, port, isWindows): string` — kill-command string builder (lines 169–186)
  - `openAdaptationEditor` becomes the thin orchestrator calling the above.  
  _File:_ `src/tools/open-adaptation-editor.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`open-adaptation-editor.ts` — stderr is piped to `'ignore'`**  
  `stdio: ['ignore', 'pipe', 'ignore']` discards stderr entirely. If the editor server fails to start, there is no way to surface the reason in the error response. Change to `'pipe'` and collect stderr output for inclusion in the timeout/error message.  
  _File:_ `src/tools/open-adaptation-editor.ts:46`  
  _Owner: tools_ | _Assignee: —_

---

## 🟡 `importKeyUserChanges` behavior contract mismatch

- [ ] **Decide: empty key-user-changes result — warn-and-continue vs. abort**  
  The PR description says "generation aborts if … no DEFAULT adaptation exists." The code throws on missing DEFAULT adaptation (correct) but only logs a warning and continues when `getKeyUserData` returns an empty array. Align the code with the documented contract: if `importKeyUserChanges: true` and the fetch returns empty, return an error instead of silently generating without changes. Update `generate-adaptation-project.ts:~108–114` and update the SKILL.md accordingly.  
  _File:_ `src/tools/generate-adaptation-project.ts:~108`  
  _Owner: tools (code) + skill (SKILL.md)_ | _Assignee: —_

---

## 🟡 `manifestContext.ts` — `isS4Cloud` monkey-patch

- [ ] **`getAvailableODataServices` patches `isS4Cloud` directly on catalog instances**  
  `serviceCatalogV2.isS4Cloud = Promise.resolve(true)` and same for V4 (lines 134–135) mutates the catalog objects in place. This is a side-effect on an external object that may not own those properties. Investigate whether `listServices()` accepts an options object or whether `isS4Cloud` is already set by the provider — if so, remove the assignments.  
  _File:_ `src/tools/functionalities/manifest-changes/manifestContext.ts:134`  
  _Owner: tools_ | _Assignee: —_

---

## 🟡 `build-dev` script divergence

- [ ] **`build-dev` now bypasses `bundle.mjs` — plugins not applied in dev builds**  
  `build-dev` was changed from `NODE_ENV=development node scripts/bundle.mjs` to `pnpm run build-esbuild-base --sourcemap=inline`. This means `onnxNodeWasmPlugin`, `pkgJsonShimPlugin`, and `sharpStubPlugin` (defined only in `bundle.mjs`) are skipped in dev builds. Dev builds may work fine on some machines (where those plugins only affect optional features) but differ from production. Restore `build-dev` to use `scripts/bundle.mjs` with a `NODE_ENV=development` flag, or add the missing plugins to the base esbuild call.  
  _File:_ `packages/fiori-mcp-server/package.json:34`  
  _Owner: tools_ | _Assignee: —_

---

## 🟡 `prettify-xml` / `adm-zip` dependency classification

- [ ] **`prettify-xml` and `adm-zip` are under `devDependencies` but used in production `src/`**  
  `manifestContext.ts` imports both `adm-zip` (for zipping `webapp/`) and `prettify-xml` (for formatting metadata XML). These are runtime imports, not build-time. Both must be moved from `devDependencies` to `dependencies` so they are available to npm consumers who install without dev deps.  
  _File:_ `package.json:61–63`  
  _Owner: tools_ | _Assignee: —_

---

## 🟡 Parser edge cases

- [ ] **`parser.ts` — path marker on same line as fence open is silently dropped**  
  The regex `PATH_MARKER` matches `**Path:** foo.ts` and `continue`s before the fence-open check on the same line. If an AI response ever emits `**Path:** foo.ts \`\`\`js` on one line, the path is captured but the fence is missed, so the block is never opened. Low real-world probability, but the parser should be robust. Add a check: after matching `PATH_MARKER`, also test the remainder of the same line for a fence-open pattern.  
  _File:_ `src/tools/adp-controller-extension/ai-response/parser.ts:22`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`parser.ts` — no extracted-files guard when `aiResponse` has zero code blocks**  
  `processAiResponse` in `processor.ts` correctly returns a `skipped` status when `changes.length === 0`, but `extractFilesFromResponse` silently returns `[]` for any malformed response. A log line at the point of extraction would help distinguish "AI sent no code" from "AI sent code but markers were malformed."  
  _File:_ `src/tools/adp-controller-extension/ai-response/processor.ts:35`  
  _Owner: tools_ | _Assignee: —_

---

## 🔵 SKILL.md — skill dev track (parallel)

- [ ] **`adp-controller-extension-flow/SKILL.md` — split 511-line file**  
  At 511 lines this is approaching the upper limit for effective skill prompts in a single context. Split into:
  - `SKILL.md` — core workflow (steps 1–14), tool contract table, error handling table, and the example session. Keep this under ~300 lines.
  - `REFERENCE.md` (or inline appendix) — confidence rubric, per-decision thresholds, actions reference table, namespace rules, HITL gating explanation.  
  The workflow steps reference the rubric by section title so the split stays navigable.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **SKILL.md — document `SESSION_LOST` error and recovery flow**  
  After the server-side guard for stale sessions is added (see stateful-browser item above), update the SKILL.md error-handling table to include:
  - `SESSION_LOST` → call `start` again and obtain a new sessionId. Log that browser state (open pages) was discarded.  
  _Owner: skill (after tools adds the guard)_ | _Assignee: —_

- [ ] **SKILL.md — `importKeyUserChanges` empty-result behavior**  
  After the code behavior is decided (see contract-mismatch item above), update the `adp-project-setup/SKILL.md` to reflect whether an empty key-user-changes result is an error or a soft warning.  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-project-setup/SKILL.md` — verify tool schema accuracy**  
  The SKILL.md documents `generate_adaptation_project` parameters. Cross-check every field against the Zod schema in `src/tools/index.ts` to confirm no parameters are missing or misnamed. Pay attention to `importKeyUserChanges` (boolean, optional) and `targetFolder` vs `appPath` distinction.  
  _Owner: skill_ | _Assignee: —_

- [ ] **SKILL.md — sessionId carry-forward guidance**  
  Add a note near the top of the `adp-controller-extension-flow/SKILL.md` workflow section: the `sessionId` returned by `start` **must be passed to every subsequent step** in the same conversation turn. The MCP server holds session state in process memory; the sessionId is the only link between steps. If a step returns `Unknown sessionId`, the server restarted — call `start` again.  
  _Owner: skill_ | _Assignee: —_

---

## 🔵 Housekeeping

- [ ] **Export `ODataMetadataEntry` from `manifestContext.ts` public barrel (`functionalities/index.ts`)**  
  So tool-layer files can import it without reaching into the `functionalities/` internals.  
  _Owner: tools_ | _Assignee: —_

- [ ] **`skills/` in `package.json` `files` — confirm intentional**  
  `"skills"` was added to the published `files` array, meaning SKILL.md and `lookup-aggregation.mjs` ship to npm consumers. The paths inside SKILL.md reference `~/.claude/skills/…` which only makes sense inside a Claude Code session. Add a comment in `package.json` or a note in `README.md` explaining that `skills/` is published intentionally for Claude Code users of the npm package.  
  _Owner: tools_ | _Assignee: —_

- [ ] **Delete this file before merging the PR**  
  _Owner: whoever merges_ | _Assignee: —_

---

## 🔴 Bugs — from reviewer (heimwege) — blocking merge

- [ ] **`generate-adaptation-project.ts` — shell-injection vulnerability via template-string command**  
  *(Already partially fixed in the current branch via `runCmdArgs` with an args array, but verify the fix is complete.)* The original code used `` `npx -y yo@4 @sap-ux/adp '${jsonString}' --force` `` which lets any single-quote in a user-supplied value (`system`, `application`, `namespace`, etc.) break out of the shell quoting. Confirm the final code passes all arguments as an array element to `spawn` with `shell: false`, never as an interpolated string.  
  _File:_ `src/tools/generate-adaptation-project.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`server.ts` SIGINT handler — `sessions` map not cleared when browser is stopped**  
  `server.ts` calls `stopBrowser()` on SIGINT, which closes pages and the browser and clears `connectionRegistry`. However, the `sessions` Map in `run-rta-workflow-step/index.ts` is a separate module-level variable that `stopBrowser` never touches. If the process manager restarts the server, module state resets anyway — but if `stopBrowser` is called while sessions exist (e.g. directly or via another code path), those session IDs remain as dangling entries that will never match a running browser page. Fix: add `sessions.clear()` in the stop-all path (either export a `clearSessions()` from `index.ts` and call it from `server.ts`, or clear inside the `stop` step when `sessions.size === 0`).  
  _File:_ `src/server.ts`, `src/tools/run-rta-workflow-step/index.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`open-adaptation-editor.ts` — `setInterval` polling instead of direct `resolve()` calls**  
  `state.resolved` is set inside event handlers (`rl.on('line')`, `rl.on('close')`, `childProcess.on('error')`) but the Promise is resolved only via a `setInterval` polling at 100 ms. This adds up to 100 ms latency on every success path for no reason. Fix: call `resolve()` directly from within each event handler instead of polling a flag.  
  _File:_ `src/tools/open-adaptation-editor.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`open-adaptation-editor.ts` — hardcoded 1-second delay after successful URL detection**  
  `await new Promise((resolve) => setTimeout(resolve, 1000))` executes unconditionally after a successful URL detection before port lookup. There is no retry or condition — it is a blind delay on every success path. Identify why it was added and remove it if there is no valid reason (e.g. replace with an actual readiness check if one is needed).  
  _File:_ `src/tools/open-adaptation-editor.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **`adp-controller-extension/output.ts` — status casing inconsistency**  
  Every other tool in the package uses `'Success'` / `'Error'` (title-case) for the `status` field. `adp-controller-extension` uses lowercase `'success'` / `'error'` / `'info'` / `'skipped'`. The output schema uses `z.string()` with no enum so neither fails validation — but callers checking status strings must handle both casings. Align `AdpControllerExtensionStatus` to use title-case values: `'Success'` / `'Error'` / `'Info'` / `'Skipped'`.  
  _File:_ `src/tools/adp-controller-extension/output.ts`  
  _Owner: tools_ | _Assignee: —_

- [ ] **Two test files deleted without explanation — restore or justify**  
  `test/unit/tools/generate-fiori-app-cap-impl.test.ts` and `test/unit/tools/generate-fiori-app-odata-impl.test.ts` were removed in this PR. These covered unrelated tools. If they were deleted by mistake, restore them. If they were intentionally moved or superseded, document why and confirm the coverage they provided still exists elsewhere.  
  _Owner: tools_ | _Assignee: —_

---

## 🟠 Architecture — from reviewer

- [ ] **`adp-controller-extension-flow/SKILL.md` step 11 — no error path if `adp_controller_extension` Phase 1 fails**  
  Step 11 goes straight from `save` to Phase 1 (`adp_controller_extension` without `aiResponse`) with no error path documented. If `manifest.appdescr_variant` is not found or the project context load fails, the tool returns an error envelope but the skill has no guidance on what to do next. Add an entry to the Error Handling table: `adp_controller_extension Phase 1 fails (manifest not found, context error)` → surface the error message, stop, ask the user to verify `appPath` points to an adaptation project root.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

---

## 🟡 SKILL.md quality — from reviewer

- [ ] **Both SKILL.md files — `kill` command is Unix-only (`lsof` doesn't exist on Windows)**  
  Both `adp-controller-extension-flow/SKILL.md` and `adp-project-setup/SKILL.md` document `lsof -ti:<port> | xargs kill` as the kill command. `lsof` does not exist on Windows. The `buildKillInstructions` helper in `open-adaptation-editor.ts` already generates the correct platform-split commands (`taskkill /PID … /F` on Windows, `kill $(lsof -ti:<port>)` on Mac/Linux). Mirror that split in both SKILL.md files.  
  _Files:_ `skills/adp-controller-extension-flow/SKILL.md`, `skills/adp-project-setup/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **Both SKILL.md files — frontmatter `author`/`version` must be nested under `metadata:`**  
  Reviewer requested:
  ```yaml
  metadata:
    author: sap-fiori-tools
    version: 0.0.1
  ```
  instead of top-level `author:` / `version:` fields.  
  _Files:_ `skills/adp-controller-extension-flow/SKILL.md`, `skills/adp-project-setup/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-project-setup/SKILL.md` — credentials warning missing**  
  Step 3 passes `password` in the tool call with no warning. The skill should note that credentials are passed to the generator and advise using system-configured credentials (stored via `@sap-ux/store`) where possible, rather than embedding them in the tool call.  
  _File:_ `skills/adp-project-setup/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — actions table framing is misleading**  
  The table is described as "canonical RTA actions" which implies it is exhaustive. A real RTA-enabled app may return many more actions (rename, move, remove, etc.). Reframe as: "these are the two actions this skill is authoritative about — if `actionsCatalog` contains other ids, surface them to the user rather than picking."  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — tool reference namespace inconsistent**  
  The tool contract section refers to `run_rta_workflow_step` (bare name) but Step 11 uses `mcp__fiori-mcp__adp_controller_extension` (fully qualified). Pick one convention and use it throughout. The bare name is cleaner for a skill doc (the MCP prefix is implementation detail); if the fully qualified form is required for tool dispatch in the host, document that once at the top and use bare names in step descriptions.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — skill description doesn't match user trigger phrases**  
  Current description starts with "Use when making RTA changes…" — most users won't say "RTA changes." Reviewer suggested:  
  > "Use when the user wants to make UI changes to a SAP Fiori adaptation project via the adaptation editor — adding buttons, fields, columns, or sections, changing labels or properties, hiding controls, or extending controllers with custom logic. Trigger on phrases like 'add a button', 'hide a field', 'add a column', 'customize the toolbar', or 'extend the controller' when working in an adaptation project context."  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-project-setup/SKILL.md` — skill description too narrow**  
  Reviewer suggested:  
  > "Use when the user wants to create, scaffold, or set up a SAP Fiori adaptation project (ADP), adapt or customize an existing Fiori app without changing its source, launch the adaptation editor, or connect to an SAP system to start making UI changes. Trigger even if the user just says 'adapt an app' or 'customize a Fiori app.'"  
  _File:_ `skills/adp-project-setup/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

- [ ] **`adp-controller-extension-flow/SKILL.md` — HITL Gating section (~130 lines) should move to a reference file**  
  At 389 lines the skill is close to the 500-line guideline. The Confidence & HITL Gating section alone is ~130 lines. Move it to `skills/adp-controller-extension-flow/references/hitl-gating.md` with a short summary and pointer in the main SKILL.md.  
  _File:_ `skills/adp-controller-extension-flow/SKILL.md`  
  _Owner: skill_ | _Assignee: —_

---

## 🟡 Changeset — from reviewer

- [ ] **Changeset message doesn't mention the new skills**  
  `.changeset/fiori-mcp-server-adp-tools.md` only mentions the three new tools. The two new SKILL.md files and `lookup-aggregation.mjs` are also published (via `"skills"` in `package.json` `files`). Update the changeset summary to mention them.  
  _File:_ `.changeset/fiori-mcp-server-adp-tools.md`  
  _Owner: tools_ | _Assignee: —_

---

## 🔵 Architecture decision — `lookup-aggregation.mjs`: shell script vs MCP tool

- [ ] **Decide and implement: promote `lookup-aggregation.mjs` to a first-class MCP tool**  
  Currently the skill instructs the AI to call `node ~/.claude/skills/…/lookup-aggregation.mjs` via the `Bash` tool to look up an aggregation's description, type, and cardinality before building a `CTX_ADDXML` payload. This has two problems:  
  1. It requires `Bash` access — not available in pure MCP clients (API-only, VS Code without shell, etc.).  
  2. The AI has to parse stdout text, not a structured response.  

  **Options considered:**
  - **A: New standalone MCP tool `get_aggregation_metadata(library, control, aggregation, ui5Url?, version?)`** — fetches from the UI5 design-time API, caches under `~/.cache/adp-aggregation-lookup/`, returns structured JSON (`description`, `type`, `cardinality`, `since`, `source`). The `.mjs` script stays as a dev/CLI convenience but is no longer the AI's primary path. SKILL.md step 6 replaces the `node …` bash call with a tool call. **This is the recommended option.**
  - **B: Add a step to `run_rta_workflow_step`** — does not fit; RTA steps are browser automation, aggregation lookup is a static HTTP fetch with no browser involvement. Mixing them bloats the step enum.
  - **C: Keep as shell script** — fragile, not portable, depends on `Bash` tool availability.

  **Decision needed:** confirm option A, assign implementation.  
  _Owner: tools_ | _Assignee: —_

---

## 🔵 SKILL.md — self-contained / install instructions

- [ ] **Both SKILL.md files — prerequisite `fiori-mcp-server` not documented**  
  The skills assume `fiori-mcp` is installed and running but do not say so. A user who finds the skill on skills.sh and installs it with `npx skills add <url>` without having `fiori-mcp` will get no useful error. Each SKILL.md should have a **Prerequisites** section at the top that names `@sap-ux/fiori-mcp-server`, explains it must be running as an MCP server, and links to the installation/setup instructions (README or npm page).  
  _Files:_ `skills/adp-controller-extension-flow/SKILL.md`, `skills/adp-project-setup/SKILL.md`  
  _Owner: skill_ | _Assignee: —_ | _Assignee: —_
