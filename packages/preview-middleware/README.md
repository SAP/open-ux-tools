#  `@sap-ux/preview-middleware`

The `@sap-ux/preview-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for previewing an application in a local Fiori launchpad . It can be used either with the `ui5 serve` or the `fiori run` commands.

## Configuration Options
| Option       | Default Value | Description |
| ------------ | ------------- | ----------- |
| `flp`        |               | Optional configuration object for the FLP sandbox |
| `flp.path`   | `/test/flp.html`   | The mount point of the generated local Fiori launchpad. |
| `flp.apps`   | `[]`          | Allows defining additional apps that available in the local Fiori launchpage |
| `debug`      | false         | Enables debug output |

## Usage
The middleware can be used without configuration. However, since the middleware intercepts a few requests that might otherwise be handled by a different middleware, it is strongly recommended to run other file serving middlewares after the `preview-middleware` e.g. `backend-proxy-middleware` and `ui5-proxy-middleware` (and the corresponding middlewares in the `@sap/ux-ui5-tooling`).
Example: [./test/fixtures//simple-app/ui5.yaml](./test/fixtures//simple-app/ui5.yaml) 

### Minimal Configuration

```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
```

### Different Path and Debugging enabled

```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      flp: 
        path: /preview.html
      debug: true
```

### Additional Applications
If you want to test cross application navigation, then you can add additional applications into the local FLP.

```Yaml
server:
  customMiddleware:
  - name: preview-middleware
    afterMiddleware: compression
    configuration:
      apps: 
        # adds an application that is locally available in ../local-folder at /apps/other-app
        - local: ../local-folder
          target: /apps/other-app
```