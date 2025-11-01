#  `@sap-ux/ui5-proxy-middleware`

The `@sap-ux/ui5-proxy-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for loading the UI5 sources in your application. It can be used either with the `ui5 serve` or the `fiori run` commands.

## Configuration Options
| Option       | Value Type    | Requirement Type | Default Value | Description |
| ------------ | ------------- |------------- | ----------- |----------- |
| `ui5`        | object  | optional | ---       | Configuration object for the UI5 proxy middleware |
| `ui5.path`   |  string | optional | `/resources`, `/test-resources`       | Path that is to be proxied |
| `ui5.url`     | string  | optional |`https://ui5.sap.com`      | URL pointing to the resources |
| `ui5.pathReplace`| string  | optional | `undefined` | If provided then the path will be replaced with this value before forwarding |
| `ui5.version`    | string  | optional |`undefined` | The UI5 version. If this property is not defined, then the `minUI5Version` from the `manifest.json` will be used |
| `secure`     | boolean  | optional | true      | Defines if SSL certs should be verified |
| `debug`      | boolean  | optional | false         | Enables debug output |
| `proxy`      |  string | optional | `undefined`   | Use for adding corporate proxy configuration |
| `directLoad` |  boolean | optional | false         | Defines whether the UI5 sources should be loaded directly from UI5 CDN |

## Usage
In order to use the middleware this is the minimal configuration that you need to provide in the `ui5.yaml` of your application. All requests to `/resources` and `/test-resources` will be proxied to the latest UI5 version at https://ui5.sap.com.

```yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
```

## Examples

### Defining url and path
If you want to explicitly define paths that should be proxied to a specific server, the following configuration is required.

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

Alternatively you can use the following syntax if all paths should be proxied to the same URL.

```Yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
    configuration:
      ui5:
        path: 
        - /resources
        - /test-resources
        url: https://ui5.sap.com
```

**NOTE: You can't mix the syntaxes!**

### Loading a specific UI5 version
To load a specific UI5 version in your application you can use the `version` parameter, e.g.

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

**NOTE: this does not work with virtualized html files provided by the `preview-middleware`. In that case, call `npx @sap-ux/create add html` to generate a physical copy of the virtualized files.**

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

### Loading UI5 sources from a different Host
If you want to load UI5 sources from a different host, then you can set the property `pathReplace` to point to the desired resources. If provided then the `path` will be replaced with this value before forwarding.

**NOTE: using `pathReplace` will not consider a specified UI5 version. If a specific UI5 version is needed, then it needs to be part of the `pathReplace`.**

```Yaml
server:
  customMiddleware:
  - name: ui5-proxy-middleware
    afterMiddleware: compression
    configuration:
      ui5:
      - path: /resources          
        url: https://my.backend.example:1234
        pathReplace: /sap/public/ui5/resources    
```

### Adding corporate proxy configuration
By default the `ui5-proxy-middleware` will read the proxy configuration from the OS environment variables `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` or from the Node.js environment variables `proxy`, `https-proxy`, and `noproxy`. If those variables are not set, then you can also provide the proxy configuration in the `ui5.yaml` file.

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
**Please note:** if you want to exclude any domains from the proxy then you will need to set the `noproxy` variable. E.g. if you want to exclude the `https://ui5.sap.com` from the proxy you will need to set `noproxy` to `npm config set noproxy ".sap.com"`. Note the leading `.`, if you provide only `sap.com`, then it will not work.

## Programmatic Usage
Alternatively you can only use the underlying proxy function, e.g. for the case when you want to incorporate the `ui5-proxy-middleware` functionality in your own middleware.

```Typescript
import { Router } from 'express';
import { ui5Proxy } from '@sap-ux/ui5-proxy-middleware';

const router = Router();
router.use("/resources/", ui5Proxy({ path: "/", url: "https://ui5.sap.com"})/*, options, filter*/);
```
- **config** - The UI5 configuration
- **options** - Options of the [http-proxy-middleware](https://www.npmjs.com/package/http-proxy-middleware#options)
- **filter** - a custom function to determine which requests should be proxied or not, [example](https://www.npmjs.com/package/http-proxy-middleware#context-matching)

## Keywords
UI5 Proxy Middleware

## Changelog

See the [CHANGELOG.md](https://github.com/SAP/open-ux-tools/blob/main/packages/ui5-proxy-middleware/CHANGELOG.md) file for details on changes and version history.
## Links

- [GitHub Package](https://github.com/SAP/open-ux-tools/tree/main/packages/ui5-proxy-middleware)