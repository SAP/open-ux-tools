# `@sap-ux/backend-proxy-middleware-cf`

The `@sap-ux/backend-proxy-middleware-cf` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for proxying requests to Cloud Foundry destinations with OAuth2 authentication. It supports proxying multiple OData source paths to a single destination URL with automatic OAuth token management.

> **⚠️ Experimental**: This middleware is currently experimental and may be subject to breaking changes or even removal in future versions. Use with caution and be prepared to update your configuration or migrate to alternative solutions if needed.

## Configuration Options

| Option              | Value Type | Requirement Type | Default Value | Description                                                                                                      |
| ------------------- | ---------- | ---------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `url`               | `string`   | **required**     | `undefined`   | Destination URL to proxy requests to.                                                                           |
| `paths`             | `string[]` | **required**     | `[]`          | Array of OData source paths to proxy to this destination. Each path represents an OData service that should be proxied. Requests matching these paths will have the path prefix removed before forwarding. |
| `credentials`       | object     | optional         | `undefined`    | Manual OAuth credentials. If not provided, middleware attempts to auto-detect from Cloud Foundry ADP project.   |
| `credentials.clientId` | `string` | mandatory (if credentials provided) | `undefined` | OAuth2 client ID.                                                                                                |
| `credentials.clientSecret` | `string` | mandatory (if credentials provided) | `undefined` | OAuth2 client secret.                                                                                            |
| `credentials.url`    | `string`   | mandatory (if credentials provided) | `undefined` | Base URL for the OAuth service. The token endpoint will be constructed as `{url}/oauth/token`.                   |
| `debug`             | `boolean`  | optional         | `false`        | Enable debug logging for troubleshooting.                                                                        |

## Usage

### Basic Configuration

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service.cfapps.eu12.hana.ondemand.com
        paths:
          - /odata/v4/visitorservice
          - /odata
```

### Automatic Detection (Recommended)

For Cloud Foundry adaptation projects, the middleware automatically detects the project configuration from `ui5.yaml` and extracts OAuth credentials from service keys. You only need to provide the `url` and `paths`:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service.cfapps.eu12.hana.ondemand.com
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

### Manual Credentials

For custom setups or when auto-detection is not available, you can provide OAuth credentials manually:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service.cfapps.eu12.hana.ondemand.com
        paths:
          - /odata/v4/visitorservice
          - /odata
        credentials:
          clientId: "sb-your-service-instance!b123|your-app!b456"
          clientSecret: "your-client-secret"
          url: "https://example.authentication.eu12.hana.ondemand.com"
        debug: true
```

The `credentials.url` should be the base URL of the UAA service (without `/oauth/token`). The middleware will automatically construct the full token endpoint.

### Multiple OData Sources

You can proxy multiple OData paths to the same destination:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service.cfapps.eu12.hana.ondemand.com
        paths:
          - /odata/v4/service1
          - /odata/v4/service2
          - /odata/v2/legacy
```

### With Debug Logging

Enable debug logging to troubleshoot issues:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        url: https://your-backend-service.cfapps.eu12.hana.ondemand.com
        paths:
          - /odata
        debug: true
```

## How It Works

1. **Proxy Setup**: Creates HTTP proxy middleware for each configured path, proxying to the destination URL.
2. **Path Rewriting**: Removes the matched path prefix before forwarding requests (e.g., `/odata/v4/service` → `/service`).
3. **OAuth Detection**: For automatic mode, checks if the project is a CF ADP project by reading `ui5.yaml` and looking for the `app-variant-bundler-build` custom task.
4. **Credentials**: Extracts `serviceInstanceName` and `serviceInstanceGuid` from the custom task configuration.
5. **Service Keys**: Retrieves service keys using `@sap-ux/adp-tooling`, which communicates with Cloud Foundry CLI.
6. **Token Endpoint**: Constructs the token endpoint from the UAA base URL as `{url}/oauth/token`.
7. **Token Management**: Requests OAuth tokens using client credentials flow.
8. **Caching**: Caches tokens in memory and refreshes them automatically 60 seconds before expiry.
9. **Request Proxying**: Adds `Authorization: Bearer <token>` header to proxied requests before forwarding.

## Error Handling

- If `url` is not provided, the middleware will be inactive and log a warning.
- If no paths are configured, the middleware will be inactive and log a warning.
- If auto-detection fails and no manual credentials are provided, the middleware will proxy requests without OAuth tokens (may fail if backend requires authentication).
- If token request fails, an error is logged but the request may still proceed (depending on the backend's authentication requirements).
- All errors are logged for debugging purposes.

## Security Considerations

- Credentials are never logged in production mode.
- Tokens are cached in memory only and never persisted to disk.
- Token refresh happens automatically 60 seconds before expiry to avoid using expired tokens.
- Service keys are obtained securely through Cloud Foundry CLI.
- The middleware only proxies requests matching any of the configured path prefixes.
- If no paths are configured, the middleware will be inactive and log a warning.

## Keywords

- OAuth2 Middleware
- Cloud Foundry ADP
- Bearer Token
- Fiori tools
- SAP UI5
- Proxy Middleware
