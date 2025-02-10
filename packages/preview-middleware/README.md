#  `@sap-ux/preview-middleware`

The `@sap-ux/preview-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for previewing an application in a local Fiori launchpad . It can be used either with the `ui5 serve` or the `fiori run` commands.
It hosts a local Fiori launchpad based on your configuration as well as offers an API to modify flex changes in your project. The API is available at `/preview/api` and additional client code required for the preview is available at `/preview/client`.

When this middleware is used together with the `reload-middleware`, then the order in which the middlewares are loaded is important. The `reload-middleware` needs to be loaded before the `preview-middleware`. Hence the configuration in the `ui5.yaml` needs to look e.g. like this:

```
- name: reload-middleware
  afterMiddleware: compression
- name: preview-middleware
  afterMiddleware: reload-middleware
```

## [Configuration Options](#configuration-options)
| Option                  | Type      | Default Value    | Description                                                                                                                                                                                                                                               |
|-------------------------|-----------|------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `flp`                   |           |                  | Optional configuration object for the local Fiori launchpad                                                                                                                                                                                               |
| `flp.path`              | `string`  | `/test/flp.html` | The mount point of the local Fiori launchpad.                                                                                                                                                                                                             |
| `flp.init`              | `string`  | `undefined`      | Optional UI5 module/script to be executed after the standard initialization                                                                                                                                                                               |
| `flp.intent`            |           |                  | Optional intent to be used for the application                                                                                                                                                                                                            |
| `flp.intent.object`     | `string`  | `app`            | Optional intent object                                                                                                                                                                                                                                    |
| `flp.intent.action`     | `string`  | `preview`        | Optional intent action                                                                                                                                                                                                                                    |
| `flp.apps`              | `array`   | `undefined`      | Optional additional local apps that are available in local Fiori launchpad                                                                                                                                                                                |
| `flp.libs`              | `boolean` | `undefined`      | Optional flag to add a generic script fetching the paths of used libraries not available in UI5. To disable set it to `false`, if not set, then the project is checked for a `load-reuse-libs` script and if available the libraries are fetched as well. |
| `flp.theme`             | `string`  | `undefined`      | Optional flag for setting the UI5 Theme.                                                                                                                                                                                                                  |
| `adp.target`            |           |                  | Required configuration for adaptation projects defining the connected backend                                                                                                                                                                             |
| `adp.ignoreCertErrors`  | `boolean` | `false`          | Optional setting to ignore certification validation errors when working with e.g. development systems with self signed certificates                                                                                                                       |
| `rta`                   |           |                  | 🚫 *Deprecated: use 'editors.rta' instead* <br/> Optional configuration allowing to add mount points for runtime adaptation                                                                                                                               |
| `editors`               |           |                  | Optional list of configurations allowing to add mount points for additional editors                                                                                                                                                                       |
| `editors.rta`           | `array`   | `undefined`      | Optional configuration allowing to add mount points for runtime adaptation                                                                                                                                                                                |
| `editors.rta.layer`     | `string`  | `(calculated)`   | Optional property for defining the runtime adaptation layer for changes (default is `CUSTOMER_BASE` or read from the project for adaptation projects)                                                                                                     |
| `editors.rta.endpoints` | `array`   | `undefined`      | Optional list of mount points for editing                                                                                                                                                                                                                 |
| `test`                  | `array`   | `undefined`      | Optional list of configurations for automated testing.                                                                                                                                                                                                    |
| `debug`                 | `boolean` | `false`          | Enables debug output                                                                                                                                                                                                                                      |

### [`flp.apps`](#configuration-option-flpapps)
Array of additional application configurations:

| Option                   | Type     | Default Value  | Description                                                                                                   |
| ------------------------ | -------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| `target`                 | `string` |                | Target path of the additional application                                                                     |
| `local` or `componentId` | `string` |                | Either a local path to a folder containing the application or the `componentId` of a remote app is required   |
| `intent`                 |          |                | Optional intent to be used for the application                                                                |
| `intent.object`          | `string` | `(calculated)` | Optional intent object, if it is not provided then it will be calculated based on the application id          |
| `intent.action`          | `string` | `preview`      | Optional intent action                                                                                        |

### [`adp.target`](#configuration-option-adptarget)
| Option        | Type                           | Description                                                                                                                                     |
| ------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | `string` mandatory (local)     | Mandatory URL pointing to the backend system. *Not required if destination is provided and the proxy is running SAP Business Application Studio |
| `destination` | `string` mandatory (if no url) | Required if the backend system is available as destination in SAP Business Application Studio.                                                  |
| `client`      | `string` optional              | sap-client parameter                                                                                                                            |
| `scp`         | `boolean` optional             | If set to true the proxy will execute the required OAuth routine for the ABAP environment on SAP BTP                                            |

### [`editors`](#configuration-option-editors)
| Option                        | Type               | Description                                                                                     |
|-------------------------------|--------------------|-------------------------------------------------------------------------------------------------|
| `rta.endpoints.path`          | `string` mandatory | The mount point to be used for the editor.                                                      |
| `rta.endpoints.developerMode` | `boolean` optional | Enables/disables the runtime adaptation developer mode (only supported for adaptation projects) |

### [`test`](#configuration-option-test)
| Option          | Type               | Description                                                                                                                                                                                                                                                                                                             |
| --------------- | -------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `framework`     | `string` mandatory | Currently `OPA5`, `QUnit` (only QUnit 2.3.2 provided as third-party module via [OpenUI5](https://github.com/SAP/openui5/blob/master/THIRDPARTY.txt)/SAPUI5) and `Testsuite` are supported. `Testsuite` will generate a testsuite for all configured frameworks that can be be used with a test runner (like e.g. karma) |
| `path`          | `string` optional  | The mount point to be used for test suite. By default `/test/opaTests.qunit.html` is used for `OPA5`, `/test/unitTests.qunit.html` is used for `QUnit` and `/test/testsuite.qunit.html` is used for `Testsuite`                                                                                                         |
| `init`          | `string` optional  | The mount point to be used for custom test runner script                                                                                                                                                                                                                                                                |
| `pattern`       | `string` optional  | Optional glob pattern to find the tests. By default `/test/**/*Journey.*` is used for `OPA5` and `/test/**/*Test.*` is used for `QUnit` (n.a. for `Testsuite`)                                                                                                                                                          |


## [Usage](#usage)
The middleware can be used without configuration. However, since the middleware intercepts a few requests that might otherwise be handled by a different middleware, it is strongly recommended to run other file serving middlewares after the `preview-middleware` e.g. `backend-proxy-middleware` and `ui5-proxy-middleware` (and the corresponding middlewares in the `@sap/ux-ui5-tooling`).
Example: [./test/fixtures/simple-app/ui5.yaml](./test/fixtures/simple-app/ui5.yaml) 

### [Minimal Configuration](#minimal-configuration)
With no configuration provided, the local FLP will be available at `/test/flp.html` and the log level is `info`.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
```

### [Different Path and Debugging enabled](#different-path-and-debugging-enabled)
With this configuration, the local FLP will be available at `/test/myFLP.html` and the log level is `debug`.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      flp: 
        path: /test/myFLP.html
      debug: true
```

### [Additional Applications](#additional-applications)
If you want to test cross application navigation, then you can add additional applications into the local FLP.
With this configuration, an application that is locally available in `../local-folder` will be available at `/apps/other-app` and will also be added as tile to the local FLP as well as one of the UI5 sample apps will be bound to the intent `TheOther-preview`.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      apps:
        - target: /apps/other-app
          local: ../local-folder
          intent: 
            object: TheLocal
            action: preview
        - target: /test-resources/sap/ushell/demoapps/AppNavSample
          componentId: sap.ushell.demo.AppNavSample
          intent: 
            object: TheOther
            action: preview
```

### [Runtime Adaptation Support](#runtime-adaptation-support)
If you want to create variants as part of your application, then you can create an additional mount point allowing to create and edit variants.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      rta:
        layer: CUSTOMER_BASE
        editors:
          - path: /test/variant-editor.html
```
This mount path can be used with a run script that looks as follows.
```Json
"start-variants-management": "ui5 serve --open \"test/variant-editor.html.html#app-preview\""
```

### [Test Suites](#test-suites)
If you want to also generate generic test suites and test runners for QUnit or OPA5 tests then you can use the following minimum configurations
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      test:
        - framework: Testsuite
        - framework: QUnit
        - framework: OPA5
```

### [Adaptation Project](#adaptation-project)
If you want to use the middleware in an adaption project, the additional `adp` object needs to be configured. This example would preview a local adaptation project merged with its reference application from the target system at `http://sap.example` and it will ignore certification validation errors. For adaptation projects, it is also recommended to add the `rta` configuration allowing to edit the project.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      adp: 
        target: 
          url: http://sap.example
        ignoreCertErrors: true
      rta:
        editors:
          - path: /test/adaptation-editor.html
            developerMode: true
```
When the middleware is used in an adaptation project together with a middleware proxying requests to the backend e.g. the `backend-proxy-middleware`, then it is critically important that the `preview-middleware` is handling requests before the backend proxy because it intercepts requests to the `manifest.json` of the original application and merges it with the local variant.
```Yaml
- name: preview-middleware
  afterMiddleware: rcompression
- name: backend-proxy-middleware
  afterMiddleware: preview-middleware
```

### [Programmatic Usage](#programmatic-usage)
Alternatively you can use the underlying middleware fuction programmatically, e.g. for the case when you want to incorporate the `preview-middleware` functionality in your own middleware.

```typescript
import { FlpSandbox } from '@sap-ux/preview-middleware';
const flp = new FlpSandbox(flpConfig, rootProject, middlewareUtil, logger);
const files = await resources.rootProject.byGlob('/manifest.json');
flp.init(JSON.parse(await files[0].getString()));

return flp.router
```
- `flpConfig` - the middleware configuration
- `rootProject` - [Reader](https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_AbstractReader.html) to access the resources of the root project
- `middlewareUtil` - [MiddlewareUtil](https://sap.github.io/ui5-tooling/v3/api/@ui5_server_middleware_MiddlewareUtil.html) of the UI5 server
- `logger` - Logger instance to be used in the middleware.


## [Migration](#migration)
If you have no custom modifications in the local Fiori Launchpad sandbox files (`<webapp>/test/flpSandbox.html` or `<webapp>/test/flpSandboxMockserver.html`), the conversion is finished.

If you have custom modifications in the local Fiori Launchpad sandbox files, you need to migrate them into a custom .js or .ts file (depending on your setup) and integrate this file as a custom `init` script into the configuration options of the middleware.

Sample:

from custom modification in `flpSandbox.html`:
```HTML
<script type="text/javascript">
    sap.ui.getCore().attachInit(function () {
        console.log('my custom code');
    });
</script>
```
to custom `test/init.ts`:
```ts 
console.log('my custom code');
```
integrated via `ui5.yaml`:

```YAML
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      flp:
        init: /test/init # <-- path to your custom init script
```