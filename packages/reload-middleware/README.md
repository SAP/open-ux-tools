#  `@sap-ux/reload-middleware`

The `@sap-ux/reload-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for reloading applications automatically during local development. Whenever a file relevant for the SAP Fiori applications is chaged the middleware will refresh the browser tab in which the application is running.

It can be used either with the `ui5 serve` or the `fiori run` commands.

When this middleware is used together with the `preview-middleware`, then the order in which the middlewares are loaded is important. The `reload-middleware` needs to be loaded before the `preview-middleware`. Hence the configuration in the `ui5.yaml` needs to look e.g. like this:

```
- name: reload-middleware
  afterMiddleware: compression
- name: preview-middleware
  afterMiddleware: reload-middleware
```


## Configuration Options

| Option       | Type | Description |
| ------------ | ------------- | ----------- |
| `path`        | `string \| string[]`      | path or list of paths that should be watched for changes by the reload-middleware. |
| `[livereload options]`    | `string \| string[] \| number \| boolean`   | Configuration options of [livereload](https://www.npmjs.com/package/livereload#server-api). |
|`https`| `object`| Configuration for starting the livereload server over https. The middleware supports automatically HTTP/2, when the UI5 server is started with the `--h2` option. In this case it uses by default `$HOME/.ui5/server/server.key` and `$HOME/.ui5/server/server.crt` |
|`https.key`| `string`| Local filesystem path to the private key for https. Alternatively you can set this also as the enviroment variable `FIORI_TOOLS_SSL_KEY`. |
|`https.cert`| `string`| Local filesystem path to the certificate for https. Alternatively you can set this also as the enviroment variable `FIORI_TOOLS_SSL_CERT`. |
|`[connectOptions]`| `string \| string[] \| number \| boolean`| Configuration options of [connect-livereload](https://www.npmjs.com/package/connect-livereload#options) |

## Configuration Examples

### [Minimal configuration](#minimal-configuration)
In order to use the middleware this is the minimal configuration that you need to provide in the `ui5.yaml` of your application. By default all files under the `webapp` folder with the following extensions `['html', 'js', 'ts', 'json','xml', 'properties', 'change', 'variant', 'appdescr_variant', 'ctrl_variant', 'ctrl_variant_change', 'ctrl_variant_management_change']` will be watched. The `livereload` server is started on port `35729`.

```YAML
server:
  customMiddleware:
  - name: reload-middleware
    afterMiddleware: compression
```

### [Using configuration properties](#using-configuration-properties)
The following configuration defines that port `33333` will be used and only files with extension `xml` and `js` under the `webapp` folder will be watched. Additionally a delay of `500ms` is specified, which means that the reload will be triggered 500ms after a change has happen.
```YAML
server:
  customMiddleware:
  - name: reload-middleware
    afterMiddleware: compression
    configuration:
      path: webapp
      port: 33333
      delay: 500
      exts:
       - xml
       - js

```

### [Watching multiple paths](#watching-multiple-paths)
You can also specify that multiple path should be watched. In this case it is also not a bad idea to activate the debug output.
```YAML
server:
  customMiddleware:
  - name: reload-middleware
    afterMiddleware: compression
    configuration:
      port: 33333
      debug: true
      path:
       - webapp
       - "../my.reuse.library/src/my/reuse/library"
```

### [Using HTTP/2](#using-http2)
This is how you can set your own HTTP/2 key and cert.
```YAML
server:
  customMiddleware:
  - name: reload-middleware
    afterMiddleware: compression
    configuration:
      path: webapp
      port: 33333
      https:
       key: /home/path/to/my/key
       cert: /home/path/to/my/cert
```

## Programmatic Usage
Alternatively you can only use the underlying middleware functions, e.g. for the case when you want to use the `reload-middleware` functionality in your `express` server.`

```Typescript
import { getLivereloadServer, getConnectLivereload } from '@sap-ux/reload-middleware';
const livereloadServer = await getLiveReloadServer(livereloadOptions);
livereloadServer.watch(watchPath);
const connectOptions = { port: livereloadServer.config.port }

return getConnectLivereload(connectOptions);
```

## Keywords
* Reload Middleware
* Fiori tools
* Fiori elements
* SAP UI5