#  `@sap-ux/backend-proxy-middleware`

The `@sap-ux/backend-proxy-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for proxying requests to backend servers. The middleware is agnostic to running in local environments and SAP Business Application Studio. Additionally, if credentials are maintained with the SAP Fiori tools then these will be used.

It can be used either with the `ui5 serve` or the `fiori run` commands.

## Configuration Options

### `backend`
| Option        | Type | Description |
| ------------- | ------------- | ----------- |
| `url`         | `string` mandatory (local)  | Mandatory URL pointing to the backend system. *Not required if destination is provided and the proxy is running SAP Business Application Studio |
| `destination` | `string` mandatory (if no url) | Required if the backend system is available as destination in SAP Business Application Studio. |
| `destinationInstance` | `string` optional | If a destination needs to be read by a specific instance of a destination service then you need to provide the id of the service as optional property `destinationInstance`.|
| `path`        | `string` mandatory     | Path that is to be proxied |
| `pathReplace`  | `string` optional      | If provided then the path will be replaced with this value before forwarding |
| `client`      | `string` optional      | sap-client parameter |
| `scp`         | `boolean` optional      | If set to true the proxy will execute the required OAuth routine for the ABAP environment on SAP BTP |
| `apiHub`      | `boolean` optional      | If set to true then the proxy will connect to the SAP API Business Hub
| `proxy`       | `string` optional      | If set then it will override the proxy settings from node.

Additional optional experimental property `bsp` (type `string`): The BSP property is only needed for the FLP Embedded Flow. The property refers to the BSP Application Name. In that case, we need to redirect the manifest.appdescr request to the local manifest.json in order to overwrite the deployed application with the local one.

### `options`
Optional object that can be used to directly set options of the used `http-proxy-middleware` modules (https://www.npmjs.com/package/http-proxy-middleware#http-proxy-middleware-options). Note: only declarative options (i.e. no functions) are supported.

## Configuration Examples

### [Connecting to a backend system](#connecting-to-a-backend-system)

Executing `ui5 serve` in your project with the configuration below in the `ui5.yaml` file would forward any request starting with the `path` parameter to the provided backend `url`.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
      path: /sap
      url: https://my.backend.example:1234
```

### [Connecting to a backend system with destination](#connecting-to-a-backend-system-with-destination)

If working in SAP Business Application Studio and the backend is configured as destination then you can also provide the `destination` in the configuration. 
If a destination needs to be read by a specific instance of a destination service then you need to provide the id of the service as optional property `destinationInstance`.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
      path: /sap
      destination: my_example_destination
```

### [Connecting to a backend system with destination and principal propagation](#connecting-to-a-backend-system-with-destination-and-principal-propagation)

If the backend destination is configured to use principal propagation, then in some cases the requests might fail. If this occurs then you will need to set the optional property `xfwd` to `true`. This will add the x-forwared headers to the proxy requests.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
      path: /sap
      destination: my_example_destination
    options:
      xfwd: true
```

### [Connecting to the SAP Business Technology Platform](#connecting-to-the-sap-business-technology-platform)
If you want to connect to an ABAP Environment on SAP Business Technology Platform then you will need to set the optional property `scp` to `true`. For any other target, remove this property or set it to `false`.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
      path: /sap
      url: https://my.steampunk.example:1234
      scp: true
```

### [Connecting to the SAP API Business Hub](#connecting-to-the-sap-api-business-hub)
If you want to connect to the SAP API Business Hub then you will need to set the optional property `apiHub` to `true`, and set the corresponding `path` and `url`, e.g.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
      path: /s4hanacloud
      url: https://api.sap.com
      apiHub: true
```

### [Proxying WebSockets](#proxying-websockets)
If you want the proxy to handle also WebSockets, then you need to set the optional property `ws` to `true`, e.g.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
      path: /sap
      url: https://my.backend.example:1234
    options:
      ws: true
```

### [Changing the path to which a request is proxied](#changing-the-path-to-which-a-request-is-proxied)
If you want to configure the proxy to send requests from a certain path `/services/odata` to your backend (local url or destination) with a specified entry path `/my/entry/path`. Then you need to do the following:

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    backend:
    - path: /services/odata
      pathReplace: /my/entry/path
      url: https://my.backend.example:1234
      destination: my_example_destination
```

### [Providing Proxy Configuration](#providing-proxy-configuration)
By default the `backend-proxy-middleware` will read the proxy configuration from the OS environment variables `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` or from the Node.js environment variables `proxy`, `https-proxy` and `noproxy`. If those variables are not set, then you can also provide the proxy configuration in the `ui5.yaml` file.

```
- name: backend-proxy-middleware
  afterMiddleware: compression
  configuration:
    proxy: https://myproxy.example:8443
    backend:
    - path: /sap
      url: https://my.backend.example:1234

```
**Please note:** if you want to exclude any domains from the proxy then you will need to set the `noproxy` variable. E.g. if you want to exclude the `https://my.backend.example:1234` from the proxy you will need to set `noproxy` to `npm config set noproxy ".backend.example"`. Note the leading `.`, if you provide only `backend.example`, then it will not work.
## Programmatic Usage
Alternatively you can only use the underlying proxy function, e.g. for the case when you want to use the `backend-proxy-middleware` functionality in your `express` server.

```Typescript
import { createProxy } from '@sap-ux/backend-proxy-middleware';
const proxy = createProxy(backend, options);
```
- **config** - The backend configuration
- **options** - Options of the [http-proxy-middleware](https://www.npmjs.com/package/http-proxy-middleware#options)

## Keywords
* Backend Proxy Middleware
* Fiori tools
* Fiori elements
* SAP UI5