# CF OAuth Middleware

OAuth2 Bearer token middleware for Cloud Foundry adaptation projects. Automatically adds authentication tokens to requests for OData and other backend services.

## Features

- **Automatic Detection**: Detects CF ADP projects and extracts OAuth credentials from service keys
- **Manual Configuration**: Supports manual credential configuration for custom setups
- **Token Caching**: Intelligently caches tokens and refreshes them before expiry
- **Path Filtering**: Only processes requests matching a configured path prefix (e.g., `/odata`)
- **Reusable**: Can be used standalone or integrated with other middlewares

## Installation

This package is part of the `@sap-ux/open-ux-tools` monorepo.

## Usage

### Automatic Detection (Recommended)

For CF ADP projects, the middleware automatically detects the project and extracts OAuth credentials:

```yaml
server:
  customMiddleware:
    - name: cf-oauth-middleware
      afterMiddleware: compression
      configuration:
        path: /odata
        debug: false
```

### Manual Credentials

For custom setups or when auto-detection is not available:

```yaml
server:
  customMiddleware:
    - name: cf-oauth-middleware
      afterMiddleware: compression
      configuration:
        path: /odata
        credentials:
          clientId: "your-client-id"
          clientSecret: "your-client-secret"
          tokenEndpoint: "https://your-uaa-url/oauth/token"
        debug: false
```

## Configuration Options

- **`path`** (optional, default: `/odata`): Path prefix to match requests. Only requests starting with this path will receive Bearer tokens.
- **`credentials`** (optional): Manual OAuth credentials. If not provided, middleware attempts auto-detection.
- **`debug`** (optional, default: `false`): Enable debug logging for troubleshooting.

## How It Works

1. **Detection**: Checks if the project is a CF ADP project by reading `ui5.yaml`
2. **Credentials**: Extracts service instance information and gets service keys using adp-tooling
3. **Token Management**: Requests OAuth tokens using client credentials flow
4. **Caching**: Caches tokens and refreshes them automatically 60 seconds before expiry
5. **Request Handling**: Adds `Authorization: Bearer <token>` header to matching requests

## Integration with Backend Proxy

This middleware should be placed **before** the backend proxy middleware:

```yaml
server:
  customMiddleware:
    - name: cf-oauth-middleware
      afterMiddleware: compression
      configuration:
        path: /odata
    - name: backend-proxy-middleware
      afterMiddleware: cf-oauth-middleware
      configuration:
        backend:
          - path: /odata
             url: http://localhost:3030
```

## Programmatic Usage

```typescript
import { OAuthTokenManager } from '@sap-ux/cf-oauth-middleware';

// From manual credentials
const manager = new OAuthTokenManager(
    'client-id',
    'client-secret',
    'https://uaa-url/oauth/token',
    logger
);

// Auto-detect from CF ADP project
const manager = await OAuthTokenManager.fromCfAdpProject(process.cwd(), logger);

// Get token
const token = await manager.getAccessToken();
```

## Error Handling

- If auto-detection fails and no manual credentials are provided, the middleware silently skips token addition
- If token request fails, an error response (500) is returned
- All errors are logged for debugging

## Security Considerations

- Credentials are never logged in production
- Tokens are cached in memory only
- Token refresh happens automatically before expiry
- Service keys are obtained securely through CF CLI

