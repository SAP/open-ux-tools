#  `@sap-ux/serve-static-middleware`

The `@sap-ux/serve-static-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for serving any static resources locally from your machine.

It can be used either with the `ui5 serve` or the `fiori run` commands.

## Configuration Options

| Option       | Type | Description |
| ------------ | ------------- | ----------- |
| `paths`        | `array`      | List of mount paths and local paths that should be handled by the serve static middleware. |
| `[option]`    | `string \| number \| boolean`   | Configuration options of [serve-static](https://www.npmjs.com/package/serve-static#options). Excluding `setHeaders`! Alternatively you can add each option on a specific path |

## Configuration Examples

### [Serving UI5 locally](#serving-ui5-locally)
**Pre-requisites:** SAPUI5 SDK version is downloaded and extracted locally on the machine. One can download UI5 resources from https://tools.hana.ondemand.com/#sapui5

Executing `ui5 serve` in your project with the configuration below in a `ui5.yaml` file would serve the UI5 sources from your machine. Any request starting with the `path` parameter will be forwarded to the local path provided in the `src` parameter.

```YAML
server:
  customMiddleware:
  - name: serve-static-middleware
    afterMiddleware: compression
    configuration:
      paths:
        - path: /resources
          src: "Path/To/SAPUI5-SDK"
        - path: /test-resources
          src: "Path/To/SAPUI5-SDK"
```

#### [Serving any type of resources locally](#serving-any-type-of-resources-locally)
Executing `npx fiori run` in your project with the configuration below in a `ui5.yaml` file would serve resources from your machine. Any request starting with the `path` parameter will be forwarded to the local path provided in the `src` parameter.

```YAML
server:
  customMiddleware:
  - name: serve-static-middleware
    afterMiddleware: compression
    configuration:
      paths:
        - path: /images
          src: "Path/To/images"
        - path: /libs
          src: "Path/To/libs"
```

#### [Mocking the User API Service from @sap/approuter](#mocking-the-user-api-service-from-sapapprouter)
If you are using the [User API Service](https://www.npmjs.com/package/@sap/approuter#user-api-service) from `@sap/approuter` in your application, then you can mock by providing the following configuration.

```YAML
server:
  customMiddleware:
  - name: serve-static-middleware
    afterMiddleware: compression
    configuration:
      paths:
        - path: /userapi/currentUser
          src: "Path/To/UserJson/user.json"
          index: false
          fallthrough: false
          redirect: false
```
whereas the `user.json` can look like this e.g.

```
{
   "firstname": "John",
   "lastname": "Doe",
   "email": "john.doe@example.com",
   "name": "john.doe@example.com",
   "displayName": "John Doe (john.doe@example.com)",
   "scopes": "openid,user_attributes,uaa.user"
}
```

### serve-static configuration options
Additionaly you can specify any of the configuration options (excluding `setHeaders`!) of the [serve-static](https://www.npmjs.com/package/serve-static#options) middleware.

E.g. you can set `fallthrough: false`, which will cause the middleware to return 404 error, when it can't find a file on the local system:

```YAML
server:
  customMiddleware:
  - name: serve-static-middleware
    afterMiddleware: compression
    configuration:
      paths:
        - path: /resources
          src: "Path/To/SAPUI5-SDK"
        - path: /test-resources
          src: "Path/To/SAPUI5-SDK"
      fallthrough: false
```

Alternatively you can set e.g. `fallthrough: false` only for specific requests:

```YAML
server:
  customMiddleware:
  - name: serve-static-middleware
    afterMiddleware: compression
    configuration:
      paths:
        - path: /resources
          src: "Path/To/SAPUI5-SDK"
          fallthrough: false
        - path: /test-resources
          src: "Path/To/SAPUI5-SDK"
```

## Programmatic Usage
Alternatively you can only use the underlying middleware function, e.g. for the case when you want to use the `serve-static-middleware` functionality in your `express` server.`

```Typescript
import { serveStaticMiddleware } from '@sap-ux/serve-static-middleware';
const serveStaticFn = serveStaticMiddleware(root, config);
```
- **root** - project root directory
- **config** - the `serve-static-middleware` configuration

## Keywords
* Serve Static Middleware
* Fiori tools
* Fiori elements
* SAP UI5
