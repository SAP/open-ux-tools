#  `@sap-ux/preview-middleware`

The `@sap-ux/preview-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for previewing an application in a local SAP Fiori launchpad. It can be used either with the `ui5 serve` or the `fiori run` commands.
It hosts a local SAP Fiori launchpad based on your configuration as well as offers an API to modify flex changes in your project. The API is available at `/preview/api` and additional client code required for the preview is available at `/preview/client`.

When this middleware is used together with the `reload-middleware`, then the order in which the middlewares are loaded is important. The `reload-middleware` needs to be loaded before the `preview-middleware`. Hence the configuration in the `ui5.yaml` needs to look e.g. like this:

```
- name: reload-middleware
  afterMiddleware: compression
- name: preview-middleware
  afterMiddleware: reload-middleware
```

## [Configuration Options](#configuration-options)
| Option                  | Value Type | Requirement Type                               | Default Value    | Description                                                                                                                                                                                                                                           |
|-------------------------|------------|------------------------------------------------|------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `flp`                   | ---        | optional                                       | ---              | Configuration object for the local SAP Fiori launchpad                                                                                                                                                                                                |
| `flp.path`              | `string`   | optional                                       | `/test/flp.html` | The mount point of the local SAP Fiori launchpad. In case no file is found at the given path, a virtual endpoint will be instantiated.                                                                                                                |
| `flp.init`              | `string`   | optional                                       | `undefined`      | UI5 module/script to be executed after the standard initialization                                                                                                                                                                                    |
| `flp.intent`            | ---        | optional                                       | ---              | Intent object to be used for the application                                                                                                                                                                                                          |
| `flp.intent.object`     | `string`   | optional                                       | `app`            | Name of the semantic object                                                                                                                                                                                                                           |
| `flp.intent.action`     | `string`   | optional                                       | `preview`        | Name of the action                                                                                                                                                                                                                                    |
| `flp.apps`              | `array`    | optional                                       | `undefined`      | Additional local apps that are available in the local SAP Fiori launchpad                                                                                                                                                                             |
| `flp.libs`              | `boolean`  | optional                                       | `false`          | Flag to add a generic script fetching the paths of used libraries not available in UI5. To disable it, set it to `false`. If not set, then the project is checked for a `load-reuse-libs` script and, if available, the libraries are fetched as well |
| `flp.theme`             | `string`   | optional                                       | `(calculated)`   | Name of the UI5 theme to be used (default is `sap_horizon` or the first entry in the sap.ui.supportedThemes list provided in the manifest.json file if `sap_horizon` is not contained in the list)                                                    |
| `flp.enhancedHomePage`  | `boolean`  | optional                                       | `false`          | Flag for enabling enhanced FLP homepage, available only from UI5 version 1.123.0 onwards                                                                                                                                                              |
| `adp.target`            | ---        | mandatory for adaptation projects              | ---              | Configuration object defining the connected back end                                                                                                                                                                                                  |
| `adp.ignoreCertErrors`  | `boolean`  | optional                                       | `false`          | Flag to ignore certification validation errors when working with development systems with self-signed certificates, for example                                                                                                                       |
| `rta`                   | ---        | 🚫 deprecated</br> *use `editors.rta` instead* | ---              | Configuration allowing to add mount points for runtime adaptation                                                                                                                                                                                     |
| `editors`               | `array`    | optional                                       | `undefined`      | List of configurations allowing to add mount points for additional editors                                                                                                                                                                            |
| `editors.rta`           | `array`    | optional                                       | `undefined`      | Configuration allowing to add mount points for runtime adaptation                                                                                                                                                                                     |
| `editors.rta.layer`     | `string`   | optional                                       | `(calculated)`   | Property for defining the runtime adaptation layer for changes (default is `CUSTOMER_BASE` or read from the project for adaptation projects)                                                                                                          |
| `editors.rta.endpoints` | `array`    | optional                                       | `undefined`      | List of mount points for editing                                                                                                                                                                                                                      |
| `editors.cardGenerator` | ---    | optional                                       | `undefined`      | Configuration object to enable card generation for an application (only supported for non-CAP apps).                                                                                                                                                  |
| `editors.cardGenerator.path` | `string`   | optional                              | `test/flpGeneratorSandbox.html`      | The mount point of the local SAP Fiori launchpad which will be considered for card generation.                                                                                                                                                        |
| `test`                  | `array`    | optional                                       | `undefined`      | List of configurations for automated testing.                                                                                                                                                                                                         |
| `debug`                 | `boolean`  | optional                                       | `false`          | Enables the debug output                                                                                                                                                                                                                              |

### [`flp.apps`](#configuration-option-flpapps)
Array of additional application configurations:

| Option                   | Value Type | Requirement Type | Default Value  | Description                                                                                                 |
| ------------------------ |------------|------------------|----------------|-------------------------------------------------------------------------------------------------------------|
| `target`                 | `string`   | mandatory        | `undefined`    | Target path of the additional application                                                                   |
| `local` or `componentId` | `string`   | mandatory        | `undefined`    | Either a local path to a folder containing the application or the `componentId` of a remote app is required |
| `intent`                 | ---        | optional         | ---            | Intent object to be used for the application                                                                |
| `intent.object`          | `string`   | optional         | `(calculated)` | Name of the semantic object. If not provided, then it will be calculated based on the application ID        |
| `intent.action`          | `string`   | optional         | `preview`      | Name of the action                                                                                          |

### [`adp.target`](#configuration-option-adptarget)
| Option        | Value Type | Requirement Type      | Default Value | Description                                                                                                                                      |
| ------------- |------------|-----------------------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| `url`         | `string`   | mandatory (local)     | `undefined`   | Mandatory URL pointing to the back-end system. *Not required if destination is provided and the proxy is running SAP Business Application Studio |
| `destination` | `string`   | mandatory (if no URL) | `undefined`   | Required if the back-end system is available as destination in SAP Business Application Studio.                                                  |
| `client`      | `string`   | optional              | `undefined`  | Parameter for the SAP client                                                                                                                     |
| `scp`         | `boolean`  | optional              | `false`       | Flag to execute the required OAuth routine for the ABAP environment on SAP BTP                                                                   |

### [`editors`](#configuration-option-editors)
| Option                        | Value Type | Requirement Type | Default Value | Description                                                                                    |
|-------------------------------|------------|------------------|---------------|------------------------------------------------------------------------------------------------|
| `rta.endpoints.path`          | `string`   | mandatory        | `undefined`   | The mount point to be used for the editor.                                                    |
| `rta.endpoints.developerMode` | `boolean`  | optional         | `false`       | Flag to enable the runtime adaptation developer mode (only supported for adaptation projects) |

### [`test`](#configuration-option-test)
| Option          | Value Type | Requirement Type | Default Value  | Description                                                                                                                                                                                                                                                                                                             |
| --------------- |------------|------------------|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `framework`     | `string`   | mandatory        | `undefined`    | Currently `OPA5`, `QUnit` (only QUnit 2.3.2 provided as third-party module using [OpenUI5](https://github.com/SAP/openui5/blob/master/THIRDPARTY.txt)/SAPUI5) and `Testsuite` are supported. `Testsuite` will generate a testsuite for all configured frameworks that can be be used with a test runner (such as karma) |
| `path`          | `string`   | optional         | `(calculated)` | The mount point to be used for test suite. By default, `/test/opaTests.qunit.html` is used for `OPA5`, `/test/unitTests.qunit.html` is used for `QUnit`, and `/test/testsuite.qunit.html` is used for `Testsuite`                                                                                                       |
| `init`          | `string`   | optional         | `undefined`    | The mount point to be used for custom test runner script                                                                                                                                                                                                                                                                |
| `pattern`       | `string`   | optional         | `(calculated)` | Optional glob pattern to find the tests. By default, `/test/**/*Journey.{js,ts}` is used for `OPA5` and `/test/**/*Test.{js,ts}` is used for `QUnit` (not applicable for `Testsuite`)                                                                                                                                   |


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
      editors:
        rta:
          layer: CUSTOMER_BASE
          endpoints:
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
When the middleware is used in an adaptation project together with a middleware proxying requests to the back end e.g. the `backend-proxy-middleware`, then it is critically important that the `preview-middleware` is handling requests before the back-end proxy because it intercepts requests to the `manifest.json` of the original application and merges it with the local variant.
```Yaml
- name: preview-middleware
  afterMiddleware: rcompression
- name: backend-proxy-middleware
  afterMiddleware: preview-middleware
```

### [Mobile Device Preview](#mobile-device-preview)
The preview middleware supports previewing applications on physical mobile devices, enabling developers to test their applications on real mobile devices directly from Visual Studio Code or SAP Business Application Studio.

Using the `--accept-remote-connections` argument, a remote URL that can be accessed from mobile devices on the same network will be logged in the console, and a QR code will be displayed for easy access.

```Json
"start-mobile": "ui5 serve --open test/flp.html#app-preview --accept-remote-connections"
```
 
### [Programmatic Usage](#programmatic-usage)
Alternatively you can use the underlying middleware function programmatically. This is useful when you want to incorporate the `preview-middleware` functionality in your own middleware.

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
If you have no custom modifications in the local SAP Fiori Launchpad sandbox files (`<webapp>/test/flpSandbox.html` or `<webapp>/test/flpSandboxMockserver.html`), the conversion is finished.

If you have custom modifications in the local SAP Fiori Launchpad sandbox files, you need to migrate them into a custom .js or .ts file (depending on your setup) and integrate this file as a custom `init` script into the configuration options of the middleware.

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
integrated using `ui5.yaml`:

```YAML
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      flp:
        init: /test/init # <-- path to your custom init script
```

## [Limitations](#limitations)
- When serving the UI5 sources from npmjs, flex changes for virtual endpoints are only supported for UI5 versions >= `1.84.x`.