# RFC: Fix `process.argv` Construction in `@sap/ux-ui5-tooling` CLI Task

## Problem

When `fiori deploy` / `fiori undeploy` is invoked via the `@sap/ux-ui5-tooling` task runner,
the function `configureCliParams()` builds `process.argv` before calling
`@sap-ux/deploy-tooling`'s `runDeploy()` / `runUndeploy()`.

**commander 14 is strict:** `process.argv` must contain only strings, and the root command
declares zero positional arguments. Any non-string value or misplaced argument is treated as
an excess positional and throws:

```
error: too many arguments. Expected 0 arguments but got 2.
```

There are **two distinct bugs** in the same source file (`src/tasks/common/index.ts`).

---

## Bug 1 — Broken spread syntax (value pushed as separate positional)

### Affected lines in `dist/cli/index.cjs`

| Line   | Current (broken)                                              |
|--------|---------------------------------------------------------------|
| 293628 | `process.argv.push(...["--description"], config.app.description)` |
| 293631 | `process.argv.push(...["--package"], config.app.package)`     |
| 293659 | `updatedArgs.push(...["--lrep"], config.lrep)`                |
| 293675 | `updatedArgs.push(...["--username"], config.credentials.username)` |
| 293679 | `updatedArgs.push(...["--password"], config.credentials.password)` |

### What goes wrong

`push(...["--flag"], value)` spreads only the single-element array, then passes `value` as a
second argument to `push`. Both `"--flag"` and `value` land in argv, but commander sees
`value` as a positional argument, not as the value of `--flag`.

### Fix

Change the spread to include the value inside the array:

```diff
- process.argv.push(...["--description"], config.app.description);
+ process.argv.push("--description", config.app.description);

- process.argv.push(...["--package"], config.app.package);
+ process.argv.push("--package", config.app.package);

- updatedArgs.push(...["--lrep"], config.lrep);
+ updatedArgs.push("--lrep", config.lrep);

- updatedArgs.push(...["--username"], config.credentials.username);
+ updatedArgs.push("--username", config.credentials.username);

- updatedArgs.push(...["--password"], config.credentials.password);
+ updatedArgs.push("--password", config.credentials.password);
```

---

## Bug 2 — Boolean values pushed into `process.argv`

### Affected lines in `dist/cli/index.cjs`

| Line   | Current (broken)                                         | Trigger condition            |
|--------|----------------------------------------------------------|------------------------------|
| 293685 | `updatedArgs.push(...["--cloud-service-env"], true)`     | `config.credentials.serviceInfo` truthy |
| 293688 | `updatedArgs.push(...["--no-strict-ssl"], true)`         | `config.ignoreCertErrors === true` |
| 293706 | `updatedArgs.push(...[\`--${key}\`, value])`             | any boolean in `params` (e.g. `verbose: true`, `safe: true`, `no-retry: true`) |

### What goes wrong

`process.argv` is typed `string[]`. Pushing a boolean `true` causes commander to coerce it to
the string `"true"` in some Node versions, but in commander 14 it arrives as a positional
argument (not consumed by the preceding flag) and triggers `excessArguments`.

The loop at line 293706 is the primary trigger — it iterates all remaining `params` entries,
including boolean flags like `verbose`, `safe`, `test`, and `no-retry`, pushing their `true`
values directly into argv.

### Fix

**For boolean flags** (flags that take no value — their presence alone sets them):
push only the flag name, not the value.

**For value-bearing flags** (flags that take a string argument):
coerce the value to a string with `String(value)`.

The cleanest fix is to split the final loop by value type:

```diff
- for (const [key, value] of Object.entries(params)) {
-     updatedArgs.push(...[`--${key}`, value]);
- }
+ for (const [key, value] of Object.entries(params)) {
+     if (typeof value === 'boolean') {
+         if (value) updatedArgs.push(`--${key}`);   // boolean flag: push name only
+     } else {
+         updatedArgs.push(`--${key}`, String(value)); // value flag: push name + string value
+     }
+ }
```

Apply the same pattern to the individual boolean pushes:

```diff
- updatedArgs.push(...["--cloud-service-env"], true);
+ updatedArgs.push("--cloud-service-env");

- updatedArgs.push(...["--no-strict-ssl"], true);
+ updatedArgs.push("--no-strict-ssl");
```

---

## Summary of all changes

| Source location (approx.)                    | Change                                                        |
|----------------------------------------------|---------------------------------------------------------------|
| `configureCliParamsUsingUI5Config` — description push | `push("--description", config.app.description)`      |
| `configureCliParamsUsingUI5Config` — package push     | `push("--package", config.app.package)`              |
| `configureCliParams` — lrep push             | `push("--lrep", config.lrep)`                                 |
| `configureCliParams` — username push         | `push("--username", config.credentials.username)`             |
| `configureCliParams` — password push         | `push("--password", config.credentials.password)`             |
| `configureCliParams` — cloud-service-env     | `push("--cloud-service-env")` (no value)                      |
| `configureCliParams` — no-strict-ssl         | `push("--no-strict-ssl")` (no value)                          |
| `configureCliParams` — final params loop     | split on `typeof value === 'boolean'`; coerce others to string |

---

## Affected `@sap-ux/deploy-tooling` commander options (for reference)

These are the flags defined in `createCommand()` (`src/cli/index.ts`) and their types:

| Flag                  | Takes value? | Type     |
|-----------------------|-------------|----------|
| `--verbose`           | No          | boolean  |
| `--yes`               | No          | boolean  |
| `--no-retry`          | No          | boolean  |
| `--test`              | No          | boolean  |
| `--safe`              | No          | boolean  |
| `--keep`              | No          | boolean  |
| `--cloud`             | No          | boolean  |
| `--cloud-service-env` | No          | boolean  |
| `--no-strict-ssl`     | No          | boolean  |
| `--create-transport`  | No          | boolean  |
| `--url`               | Yes         | string   |
| `--destination`       | Yes         | string   |
| `--client`            | Yes         | string   |
| `--service`           | Yes         | string   |
| `--package`           | Yes         | string   |
| `--transport`         | Yes         | string   |
| `--name`              | Yes         | string   |
| `--description`       | Yes         | string   |
| `--username`          | Yes         | string   |
| `--password`          | Yes         | string   |
| `--lrep`              | Yes         | string   |
| `--authentication-type` | Yes       | string   |
| `--archive-url`       | Yes         | string   |
| `--archive-path`      | Yes         | string   |
| `--archive-folder`    | Yes         | string   |
| `--cloud-service-key` | Yes         | string   |
| `--connect-path`      | Yes         | string   |
| `--query-params`      | Yes         | string   |
