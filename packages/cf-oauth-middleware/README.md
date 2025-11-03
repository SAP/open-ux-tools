# `@sap-ux/cf-oauth-middleware`

The `@sap-ux/cf-oauth-middleware` is a [Custom UI5 Server Middleware](https://sap.github.io/ui5-tooling/pages/extensibility/CustomServerMiddleware) for adding OAuth2 Bearer tokens to requests for Cloud Foundry adaptation projects. It can be used either with the `ui5 serve` or the `fiori run` commands.

The middleware automatically detects CF ADP projects and extracts OAuth credentials from service keys, or can be configured manually with OAuth credentials. It intelligently caches tokens and refreshes them automatically before expiry.

## Configuration Options

| Option              | Value Type | Requirement Type | Default Value | Description                                                                                                      |
| ------------------- | ---------- | ---------------- | ------------- | ---------------------------------------------------------------------------------------------------------------- |
| `paths`              | `string[]`   | optional         | `[]`       | Array of path prefixes to match requests. Only requests starting with these paths will receive Bearer tokens. If empty, middleware will be inactive.                |
| `credentials`       | object     | optional         | `undefined`    | Manual OAuth credentials. If not provided, middleware attempts to auto-detect from Cloud Foundry ADP project.   |
| `credentials.clientId` | `string` | mandatory (if credentials provided) | `undefined` | OAuth2 client ID.                                                                                                |
| `credentials.clientSecret` | `string` | mandatory (if credentials provided) | `undefined` | OAuth2 client secret.                                                                                            |
| `credentials.url`    | `string`   | mandatory (if credentials provided) | `undefined` | Base URL for the OAuth service. The token endpoint will be constructed as `{url}/oauth/token`.                   |
| `debug`             | `boolean`  | optional         | `false`        | Enable debug logging for troubleshooting.                                                                        |

## Usage

### [Automatic Detection (Recommended)](#automatic-detection-recommended)

For Cloud Foundry adaptation projects, the middleware automatically detects the project configuration from `ui5.yaml` and extracts OAuth credentials from service keys. No manual configuration is required.

    ```yaml
    server:
      customMiddleware:
        - name: cf-oauth-middleware
          afterMiddleware: compression
          configuration:
            paths:
              - /odata/v4/visitorservice
              - /odata
    ```

The middleware will:

1. Read the `app-variant-bundler-build` custom task from `ui5.yaml`
2. Extract `serviceInstanceName` and `serviceInstanceGuid`
3. Retrieve service keys using `@sap-ux/adp-tooling`
4. Extract UAA credentials and construct the token endpoint
5. Extract OAuth paths from `xs-app.json` (if available) by finding routes with an `endpoint` property

### [Manual Credentials](#manual-credentials)

For custom setups or when auto-detection is not available, you can provide OAuth credentials manually:

    ```yaml
    server:
      customMiddleware:
        - name: cf-oauth-middleware
          afterMiddleware: compression
          configuration:
            paths:
              - /odata/v4/visitorservice
              - /odata
            credentials:
              clientId: "sb-your-service-instance!b123|your-app!b456"
              clientSecret: "your-client-secret"
              url: "https://example.authentication.eu12.hana.ondemand.com"
            debug: true
    ```

The `url` should be the base URL of the UAA service (without `/oauth/token`). The middleware will automatically construct the full token endpoint.

### [Custom Path](#custom-path)

If you want to match a different path prefix:

    ```yaml
    server:
      customMiddleware:
        - name: cf-oauth-middleware
          afterMiddleware: compression
          configuration:
            paths:
              - /api
    ```

### [Integration with Backend Proxy](#integration-with-backend-proxy)

This middleware should be placed **before** the backend proxy middleware so that tokens are added before requests are forwarded:

    ```yaml
    server:
      customMiddleware:
        - name: cf-oauth-middleware
          afterMiddleware: compression
          configuration:
            paths:
              - /odata/v4/visitorservice
              - /odata
        - name: fiori-tools-proxy
          afterMiddleware: cf-oauth-middleware
          configuration:
            backend:
              - path: /odata
                url: "https://your-backend-service.cfapps.eu12.hana.ondemand.com"
    ```

### [Complete Cloud Foundry adaptation project Example](#complete-cloud-foundry-adaptation-project-example)

For a complete Cloud Foundry adaptation project setup with OAuth and preview:

    ```yaml
    server:
      customMiddleware:
        - name: cf-oauth-middleware
          afterMiddleware: compression
          configuration:
            paths:
              - /odata/v4/visitorservice
              - /odata
        - name: fiori-tools-proxy
          afterMiddleware: cf-oauth-middleware
          configuration:
            backend:
              - path: /odata
                url: "https://your-backend-service.cfapps.eu12.hana.ondemand.com"
            ui5:
              url: https://ui5.sap.com
        - name: fiori-tools-preview
          afterMiddleware: fiori-tools-proxy
          configuration:
            flp:
              theme: sap_horizon
    ```

## Programmatic Usage

Alternatively, you can use the underlying token manager and factory functions programmatically:

    ```typescript
    import {
        OAuthTokenManager,
        createManagerFromCredentials,
        createManagerFromOAuthCredentials,
        createManagerFromCfAdpProject
    } from '@sap-ux/cf-oauth-middleware';
    import type { ToolsLogger } from '@sap-ux/logger';
    import type { CfCredentials } from '@sap-ux/adp-tooling';

    // From CF credentials (extracted from service keys)
    const credentials: CfCredentials = {
        uaa: {
            clientid: 'client-id',
            clientsecret: 'client-secret',
            url: 'https://example'
        },
        // ... other properties
    };
    const manager = createManagerFromCredentials(credentials, logger);

    // From direct OAuth credentials (base URL)
    const manager = createManagerFromOAuthCredentials(
        'client-id',
        'client-secret',
        'https://example',
        logger
    );

    // Auto-detect from CF ADP project
    const manager = await createManagerFromCfAdpProject(process.cwd(), logger);

    // Get access token
    const token = await manager.getAccessToken();
    ```

## How It Works

1. **Detection**: For automatic mode, checks if the project is a CF ADP project by reading `ui5.yaml` and looking for the `app-variant-bundler-build` custom task.
2. **Credentials**: Extracts `serviceInstanceName` and `serviceInstanceGuid` from the custom task configuration.
3. **Service Keys**: Retrieves service keys using `@sap-ux/adp-tooling`, which communicates with Cloud Foundry CLI.
4. **Token Endpoint**: Constructs the token endpoint from the UAA base URL as `{url}/oauth/token`.
5. **Token Management**: Requests OAuth tokens using client credentials flow.
6. **Caching**: Caches tokens in memory and refreshes them automatically 60 seconds before expiry.
7. **Request Handling**: Adds `Authorization: Bearer <token>` header to requests matching any of the configured path prefixes.
8. **OAuth Paths Extraction**: For automatic detection, extracts OAuth paths from `xs-app.json` routes that have an `endpoint` property. Routes with `service: "html5-apps-repo-rt"` are automatically filtered out.

## Error Handling

- If auto-detection fails and no manual credentials are provided, the middleware silently skips token addition (requests proceed without tokens).
- If token request fails, an error response (500) is returned with the error message.
- All errors are logged for debugging purposes.
- If a token request fails, subsequent requests will retry the token fetch.

## Security Considerations

- Credentials are never logged in production mode.
- Tokens are cached in memory only and never persisted to disk.
- Token refresh happens automatically 60 seconds before expiry to avoid using expired tokens.
- Service keys are obtained securely through Cloud Foundry CLI.
- The middleware only adds tokens to requests matching any of the configured path prefixes.
- If no paths are configured, the middleware will be inactive and log a warning.

## Keywords

- OAuth2 Middleware
- Cloud Foundry ADP
- Bearer Token
- Fiori tools
- SAP UI5
