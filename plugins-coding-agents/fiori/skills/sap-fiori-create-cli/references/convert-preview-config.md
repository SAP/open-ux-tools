# convert preview-config — Full Migration Workflow

Runs `convert preview-config` (see CLI reference in SKILL.md) on a SAP Fiori app, then detects and automatically handles any manual migration steps that the tool cannot do itself.

## Prerequisites (hard errors - must be resolved before conversion)

If the command fails with any of the following errors, stop and explain what the user must fix first - do NOT try to auto-fix these:

- `@ui5/cli` version 3.0.0 or higher required - see https://sap.github.io/ui5-tooling/v3/updates/migrate-v3
- `@sap/ux-ui5-tooling` version 1.15.4 or higher required
- `@sap-ux/ui5-middleware-fe-mockserver` must be present (or `cds-plugin-ui5` for CAP projects). Usage of `sap.ui.core.util.MockServer` is not supported. Must migrate to `@sap-ux/ui5-middleware-fe-mockserver` first.
- `@sap/grunt-sapui5-bestpractice-build` is present - migration to UI5 CLI required first

## Steps

### 1. Determine the target path

If the user specified a project path, use it. Otherwise use the current working directory. Ask if unclear.

### 2. Ask about options if not already specified

Ask the user two questions (can combine into one message):
- **Simulate first?** (`--simulate=true` does a dry run showing what would change without writing files). Recommend yes for first run.
- **Convert test runners too?** (`--tests=true` also converts test suite and test runner configs). Default: false unless the user mentions tests.

If the user just says "go ahead" or "run it", use `--simulate=false --tests=false` as defaults and skip prompting.

### 3. Run the command

Use the invocation from SKILL.md. Capture the full stdout+stderr output.

### 4. Check for prerequisite errors

Scan the output for the prerequisite error messages listed above. If found:
- Report them clearly to the user
- Explain what they must do to fix the prerequisite
- Stop - do not proceed to manual migration steps

### 5. Check for manual migration warnings

The tool logs warnings for two cases it **cannot** handle automatically:

**Karma warning** (appears when `karma-ui5` is a dependency and `--tests=true`):
> "Please update your karma configuration ('ui5.configPath' and 'ui5.testpage') according to the new virtual endpoints after the conversion."

**WebdriverIO QUnit Service warning** (appears when `wdio-qunit-service` is a dependency and `--tests=true`):
> "Please update your WebdriverIO QUnit Service test paths according to the new virtual endpoints after the conversion."

### 6. Handle manual migration steps automatically

#### 6a. HTML sandbox custom init migration (always check, regardless of --tests flag)

After the command runs, the old sandbox HTML files are renamed to `*_old.html` (e.g. `flpSandbox_old.html`, `flpSandboxMockserver_old.html`). Check each `*_old.html` file for custom modifications that need to be migrated to a `flp.init` script.

**How to detect custom modifications:**

Read the `*_old.html` file(s) and look for any `<script>` blocks that contain application-specific logic beyond the standard boilerplate. The standard boilerplate only contains:
- The `window["sap-ushell-config"]` block (FLP shell configuration)
- The `<script src=".../bootstrap/sandbox.js">` loader
- The `<script id="sap-ui-bootstrap">` UI5 core bootstrap
- The `<script id="locate-reuse-libs">` script tag

**Anything else in a `<script>` block is a custom modification** - for example:
```html
<script type="text/javascript">
    sap.ui.getCore().attachInit(function () {
        console.log('my custom code');
    });
</script>
```

**If custom modifications are found:**

1. Extract the custom JavaScript from the `<script>` block(s) - strip the outer `<script>` tags, keep only the JS code inside
2. Determine the file extension: check whether the project uses TypeScript (look for `.ts` files e.g. in `webapp/` or a `tsconfig.json`) - if yes, create `.ts`, otherwise `.js`
3. Create `webapp/test/flpSandboxInit.js` (or `.ts`) with the extracted code
4. Register the init script in `ui5.yaml` under the `fiori-tools-preview` or `preview-middleware` configuration:
   ```yaml
   configuration:
     flp:
       init: /test/flpSandboxInit  # no file extension - UI5 module path
   ```
   Read the current `ui5.yaml`, add or update the `flp.init` property, and write it back.
5. Show the user what was extracted and what files were created/modified before writing.

**If no custom modifications are found:** inform the user that the HTML files had no custom code and migration is complete. Ask the user to delete the `*_old.html` files.

#### 6b. Karma migration (only if Karma warning was detected)

1. Find the Karma config file (usually `karma.config.js` or `karma.conf.js` in the project root)
2. Read the current content
3. The old preview used a local HTML file path in `ui5.testpage`, e.g. `webapp/test/flpSandbox.html`. The new virtual endpoint format is `/test/flp.html` or the path as configured in `ui5.yaml` under the `fiori-tools-preview` or `preview-middleware` middleware `flp.path` setting.
4. Read the updated `ui5.yaml` to find the actual virtual path configured by the conversion
5. Update `ui5.configPath` to point to the new `ui5.yaml` location if it changed
6. Update `ui5.testpage` to the new virtual endpoint path
7. Show the diff to the user before writing
8. Write the updated Karma config

#### 6c. WebdriverIO QUnit Service migration (only if WebdriverIO warning was detected)

1. Find the WebdriverIO config file (usually `wdio.conf.js` or `wdio.conf.ts` in the project root)
2. Read the current content
3. Find the QUnit service configuration - look for `'wdio-qunit-service'` in the `services` array
4. The old test paths reference local HTML files (e.g. `webapp/test/testsuite.qunit.html`). The new virtual endpoint format uses `/test/testsuite.qunit.html` (served by the middleware).
5. Read the updated `ui5.yaml` to confirm the middleware path prefix
6. Update the test page paths in the QUnit service config to use the virtual endpoint format
7. Show the diff to the user before writing
8. Write the updated WebdriverIO config

### 7. Report results

After everything is done, give a clear summary:

- Whether this was a simulation or real run
- What files were changed/renamed/deleted by the tool
- Which manual migration steps were completed (if any)
- Next steps: if simulation, suggest running again with `--simulate=false` to apply. If real run, suggest testing the preview with `npm run start` or the equivalent script.

## Example output summary

```
Conversion complete.

Changes applied by the tool:
- ui5.yaml updated with virtual preview middleware config
- webapp/test/flpSandbox.html renamed to webapp/test/flpSandbox_old.html
- webapp/test/flpSandbox.js deleted

Manual steps completed:
- webapp/test/flpSandboxInit.ts created with custom init code extracted from flpSandbox_old.html
- ui5.yaml updated: flp.init set to /test/flpSandboxInit
- karma.config.js: updated ui5.testpage to /preview.html

Next steps: Run `npm run start` to verify the preview works correctly.
```
