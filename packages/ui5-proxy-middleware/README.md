#  `@sap-ux/ui5-proxy-middleware`

The `@sap-ux/ui5-proxy-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for loading the UI5 sources in your application. It can be used either with the `ui5 serve` or the `fiori run` commands.

## Configuration Options
| Option       | Default Value | Description |
| ------------ | ------------- | ----------- |
| `ui5`        | mandatory     | List of mount paths and target urls that should be handled by the proxy |
| `version`    | `undefined`   | The UI5 version. If this property is not defined, then the `minUI5Version` from the `manifest.json` will be used |
| `secure`     | true          | Defines if SSL certs should be verified |
| `debug`      | false         | Enables debug output |
| `proxy`      | `undefined`   | Use for adding corporate proxy configuration |
| `directLoad` | false         | Defines whether the UI5 sources should be loaded directly from UI5 CDN |

## Usage
In order to use the middleware this is the minimal configuration that you need to provide in the `ui5.yaml` of your application.

```Yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
    configuration:
      ui5:
      - path: /resources
        url: https://ui5.sap.com
      - path: /test-resources
        url: https://ui5.sap.com
```

## Examples
### Loading a specific UI5 version
To load a specific a UI5 version in your application you can use the `version` parameter, e.g.

```Yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
    configuration:
      ui5:
      - path: /resources
        url: https://ui5.sap.com
      - path: /test-resources
        url: https://ui5.sap.com
      version: 1.96.1
```

### Loading UI5 sources directly from UI5 CDN
If you don't load all UI5 source through the `ui5-proxy-middleware`, then you can set `directLoad: true`. This will inject the absolute UI5 URL in the bootstrap of your HTML file, thus loading the libraries directly from UI5 CDN.

```Yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
    configuration:
      ui5:
      - path: /resources
        url: https://ui5.sap.com
      - path: /test-resources
        url: https://ui5.sap.com
      directLoad: true
```

### Adding corporate proxy configuration
If you are behind a corporate proxy then you can provide your corporate proxy configuration as follows.

```Yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
    configuration:
      ui5:
      - path: /resources
        url: https://ui5.sap.com
      - path: /test-resources
        url: https://ui5.sap.com
      proxy: https://my.corporate.proxy.example
```

## Programmatic Usage
Alternatively you can only use the underlying proxy function, e.g. for the case when you want to incorporate the `ui5-proxy-middleware` functionality in your own middleware.

```Typescript
import { ui5Proxy } from '@sap-ux/ui5-proxy-middleware';
const ui5ProxyMiddlewareFn = ui5Proxy(config, options, filter)
```
- **config** - The UI5 configuration
- **options** - Options of the [http-proxy-middleware](https://www.npmjs.com/package/http-proxy-middleware#options)
- **filter** - a custom function to determine which requests should be proxied or not, [example](https://www.npmjs.com/package/http-proxy-middleware#context-matching)

## Keywords
UI5 Proxy Middleware
