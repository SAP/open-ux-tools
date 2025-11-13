# @sap-ux/project-analyser

Utility library for analysing SAP Fiori applications and deriving bill of materials (BOM) insights for downstream tooling.

## Usage via `@sap-ux/project-access`

`project-access` now exposes the analyser as part of its application facade so callers do not have to manage file loading, UI5 configuration, or specification resolution themselves.

```ts
import { createProjectAccess } from '@sap-ux/project-access';

const projectAccess = await createProjectAccess('/path/to/project-root', { logger });
const appAccess = projectAccess.getApplication(projectAccess.getApplicationIds()[0]);
const analysis = await appAccess.getAppAnalysis();

if (analysis.status === 'success') {
    console.log(analysis.billOfMaterials?.summary);
}
```

Behind the scenes `getAppAnalysis()` resolves the webapp directory (using `ui5.yaml` when present), loads manifest and annotation artefacts, and delegates to this package to assemble the BOM.

## Direct consumption

The analyser can still be invoked headlessly when the caller already manages I/O boundaries:

```ts
import { analyzeApp } from '@sap-ux/project-analyser';

const result = await analyzeApp({ appPath: '/absolute/path/to/webapp' });
```

When calling it directly you are responsible for locating the webapp folder and providing any logging you need.

## Dependency boundaries

- Runtime types for manifests originate from `@ui5/manifest` and the analyser pulls Fiori specification metadata from `@sap/ux-specification`.
- The package itself no longer depends on `@sap-ux/project-access`; instead, that module wraps the analyser and enriches it with project resolution logic.
- Manifest and annotation parsing currently focuses on Fiori elements V4 List Report/Object Page templates; other templates will evolve over time.

## Behaviour notes

- Webapp path resolution honours `ui5.yaml>paths.webapp`. If that configuration is missing or the YAML is invalid, the integration falls back to `<appRoot>/webapp` and logs a debug message when a logger is supplied.
- Logging is optional. Pass a `Logger` to `analyzeApp(options, logger)` or rely on the logger registered with `project-access`.

## Development & testing

```bash
# Compile the analyser
pnpm nx build @sap-ux/project-analyser

# Run linting
pnpm nx lint @sap-ux/project-analyser

# Execute unit tests
pnpm nx test @sap-ux/project-analyser
```

## Contributing

Please refer to the repository guidelines in `docs/Guidelines.md` before opening a pull request.

## License

Apache-2.0, see `LICENSE`.

