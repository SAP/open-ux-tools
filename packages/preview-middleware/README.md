#  `@sap-ux/preview-middleware`

The `@sap-ux/preview-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for previewing an application in a local Fiori launchpad . It can be used either with the `ui5 serve` or the `fiori run` commands.
It hosts a local Fiori launchpad based on your configuration as well as offers an API to modify flex changes in your project. The API is available at `/preview/api` and additional client code required for the preview is available at `/preview/client`.

## Configuration Options
| Option                 | Type      | Default Value    | Description                                                                                                                         |
| ---------------------- | --------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `flp`                  |           |                  | Optional configuration object for the local Fiori launchpad                                                                         |
| `flp.path`             | `string`  | `/test/flp.html` | The mount point of the local Fiori launchpad.                                                                                       |
| `flp.intent`           |           |                  | Optional intent to be used for the application                                                                                      |
| `flp.intent.object`    | `string`  | `app`            | Optional intent object                                                                                                              |
| `flp.intent.action`    | `string`  | `preview`        | Optional intent action                                                                                                              |
| `flp.apps`             | `array`   | `undefined`      | Optional additional local apps that are available in local Fiori launchpad                                                          |
| `flp.libs`             | `boolean` | `undefined`      | Optional flag to add a generic script fetching the paths of used libraries not available in UI5. To disable set it to `false`, if not set, then the project is checked for a `load-reuse-libs` script and if available the libraries are fetched as well. |
| `flp.theme`             | `string` | `undefined`      | Optional flag for setting the UI5 Theme. |
| `adp.target`           |           |                  | Required configuration for adaptation projects defining the connected backend                                                       |
| `adp.ignoreCertErrors` | `boolean` | `false`          | Optional setting to ignore certification validation errors when working with e.g. development systems with self signed certificates |
| `rta`                  |           |                  | Optional configuration allowing to add mount points for runtime adaptation                                                          |
| `rta.layer`            | `string`  | `(calculated)`   | Optional property for defining the runtime adaptation layer for changes (default is `CUSTOMER_BASE` or read from the project for adaptation projects) |
| `rta.editors`          | `array`   | `undefined`      | Optional list of mount points for editing                                                                                           |
| `debug`                | `boolean` | `false`          | Enables debug output                                                                                                                |

### `flp.apps`
Array of additional application configurations:
| Option          | Type     | Default Value  | Description                                                                                          |
| --------------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------- |
| `target`        | `string` |                | Target path of the additional application                                                            |
| `local`         | `string` |                | Local path to the folder containing the application                                                  |
| `intent`        |          |                | Optional intent to be used for the application                                                       |
| `intent.object` | `string` | `(calculated)` | Optional intent object, if it is not provided then it will be calculated based on the application id |
| `intent.action` | `string` | `preview`      | Optional intent action                                                                               |

### `adp.target`
| Option        | Type                           | Description                                                                                                                                     |
| ------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | `string` mandatory (local)     | Mandatory URL pointing to the backend system. *Not required if destination is provided and the proxy is running SAP Business Application Studio |
| `destination` | `string` mandatory (if no url) | Required if the backend system is available as destination in SAP Business Application Studio.                                                  |
| `client`      | `string` optional              | sap-client parameter                                                                                                                            |
| `scp`         | `boolean` optional             | If set to true the proxy will execute the required OAuth routine for the ABAP environment on SAP BTP                                            |

### `rta.editors`
| Option          | Type               | Description                                                                                    |
| --------------- | -------------------| -----------------------------------------------------------------------------------------------|
| `path`          | `string` mandatory | The mount point to be used for the editor.                                                     |
| `developerMode` | `boolean` optional | Enables/disables the runtime adaptation developer mode (only supported for adaptation projects) |


## Usage
The middleware can be used without configuration. However, since the middleware intercepts a few requests that might otherwise be handled by a different middleware, it is strongly recommended to run other file serving middlewares after the `preview-middleware` e.g. `backend-proxy-middleware` and `ui5-proxy-middleware` (and the corresponding middlewares in the `@sap/ux-ui5-tooling`).
Example: [./test/fixtures/simple-app/ui5.yaml](./test/fixtures/simple-app/ui5.yaml) 

### Minimal Configuration
With no configuration provided, the local FLP will be available at `/test/flp.html` and the log level is `info`.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
```

### Different Path and Debugging enabled
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

### Additional Applications
If you want to test cross application navigation, then you can add additional applications into the local FLP.
With this configuration, an application that is locally available in `../local-folder` will be available at `/apps/other-app` and will also be added as tile to the local FLP.
```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      apps:
        - local: ../local-folder
          target: /apps/other-app
```

### Runtime Adaptation Support
If you want to create variants as part of your application, then you can create an additional mount point allowing to created and edit variants.
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


### Adaptation Project
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

### Programmatic Usage
Alternatively you can use the underlying middleware fuction programmatically, e.g. for the case when you want to incorporate the `preview-middleware` functionality in your own middleware.

```typescript
import { FlpSandbox } from '@sap-ux/preview-middleware';
const flp = new FlpSandbox(flpConfig, rootProject, middlewareUtil, logger);
const files = await resources.rootProject.byGlob('/manifest.json');
flp.init(JSON.parse(await files[0].getString()));

return flp.router
```
- `flpConfig` - the middleware configuration
- `rootProject` - [Reader](https://sap.github.io/ui5-tooling/stable/api/@ui5_fs_AbstractReader.html) to access resources of the root project
- `middlewareUtil` - [MiddlewareUtil](https://sap.github.io/ui5-tooling/v3/api/@ui5_server_middleware_MiddlewareUtil.html) of the UI5 server
- `logger` - Logger instance for use in the middleware.
