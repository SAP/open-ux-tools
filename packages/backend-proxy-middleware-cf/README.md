[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/backend-proxy-middleware-cf/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/backend-proxy-middleware-cf)

# [`@sap-ux/backend-proxy-middleware-cf`](https://github.com/SAP/open-ux-tools/tree/main/packages/backend-proxy-middleware-cf)

The `@sap-ux/backend-proxy-middleware-cf` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for proxying requests to Cloud Foundry destinations with OAuth2 authentication. It supports proxying multiple OData source paths to a single destination URL with automatic OAuth token management.

> **⚠️ Experimental**: This middleware is currently experimental and may be subject to breaking changes or even removal in future versions. Use with caution and be prepared to update your configuration or migrate to alternative solutions if needed.

It can be used either with the `ui5 serve` or the `fiori run` commands.

## [Configuration Options](#configuration-options)

| Option              | Value Type | Requirement Type | Default Value | Description                                                                                                      |
| ------------------- | ---------- | ---------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `url`               | `string`   | **required**     | `undefined`   | Destination URL to proxy requests to.                                                                           |
| `paths`             | `string[]` | **required**     | `[]`          | Array of OData source paths to proxy to this destination. Each path represents an OData service that should be proxied. Requests matching these paths will have the path prefix removed before forwarding. |
| `credentials`       | object     | optional         | `undefined`    | Manual OAuth credentials. If not provided, middleware attempts to auto-detect from Cloud Foundry ADP project.   |
| `credentials.clientId` | `string` | mandatory (if credentials provided) | `undefined` | OAuth2 client ID.                                                                                                |
| `credentials.clientSecret` | `string` | mandatory (if credentials provided) | `undefined` | OAuth2 client secret.                                                                                            |
| `credentials.url`    | `string`   | mandatory (if credentials provided) | `undefined` | Base URL for the OAuth service. The token endpoint will be constructed as `{url}/oauth/token`.                   |
| `debug`             | `boolean`  | optional         | `false`        | Enable debug logging for troubleshooting.                                                                        |

## [Usage](#usage)

### [Basic Configuration](#basic-configuration)

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service
        paths:
          - /odata/v4/visitorservice
          - /odata
```

### [Automatic Detection (Recommended)](#automatic-detection-recommended)

For Cloud Foundry adaptation projects, the middleware automatically detects the project configuration from `ui5.yaml` and extracts OAuth credentials from service keys. You only need to provide the `url` and `paths`:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service
        paths:
          - /odata/v4/visitorservice
          - /odata
```

The middleware will:

1. Read the `app-variant-bundler-build` custom task from `ui5.yaml`
2. Extract `serviceInstanceName` and `serviceInstanceGuid`
3. Retrieve service keys using `@sap-ux/adp-tooling`
4. Extract UAA credentials and construct the token endpoint
5. Automatically add Bearer tokens to proxied requests

### [Manual Credentials](#manual-credentials)

For custom setups or when auto-detection is not available, you can provide OAuth credentials manually:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service
        paths:
          - /odata/v4/visitorservice
          - /odata
        credentials:
          clientId: "your-service-instance!b123|your-app!b456"
          clientSecret: "your-client-secret"
          url: "https://example.authentication"
        debug: true
```

The `credentials.url` should be the base URL of the UAA service (without `/oauth/token`). The middleware will automatically construct the full token endpoint.

### [With Debug Logging](#with-debug-logging)

Enable debug logging to troubleshoot issues:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service
        paths:
          - /odata
        debug: true
```

## [Keywords](#keywords)

- OAuth2 Proxy Middleware
- Cloud Foundry ADP
- Fiori tools
- SAP UI5
