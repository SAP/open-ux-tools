# `@sap-ux/backend-proxy-middleware-cf`

UI5 server middleware that uses `@sap/approuter` to make destinations configured in SAP Cloud Foundry or SAP XS Advanced available for local development. Requests to destination routes are proxied to a local approuter instance via `http-proxy-middleware`.

> **⚠️ Experimental**: This middleware is currently experimental and may be subject to breaking changes or even removal in future versions. Use with caution and be prepared to update your configuration or migrate to alternative solutions if needed.

## Prerequisites

- [@ui5/cli](https://ui5.github.io/cli/) 3.0 or later (specVersion 3.0 in `ui5.yaml`)

## Install

```bash
pnpm add -D @sap-ux/backend-proxy-middleware-cf
```

## Configuration (ui5.yaml)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | Verbose logging |
| `port` | `number` | `5000` | Port for the local approuter |
| `xsappJsonPath` | `string` | `"./xs-app.json"` | Path to the CF-style approuter config (e.g. `xs-app.json`). Destination route sources should match the pattern `/[^/]*\/(.*\/)?[^/]*/` (e.g. `"^/backend/(.*)$"`). |
| `envOptionsPath` | `string` | — | Path (relative to project root) to a JSON file. Each top-level key is set on `process.env` (objects/arrays are JSON-stringified) so the approuter can read credentials and services. The key `destinations` is skipped so the middleware's `destinations` config takes precedence. |
| `destinations` | `array` or `string` | `[]` | List of `{ name, url }` destinations (names must match routes in `xs-app.json`). Or use `"$env:VAR"` to read a JSON string from `process.env[VAR]` (e.g. from a `.env` file). |
| `allowServices` | `boolean` | `false` | Allow BTP services referenced in `xs-app.json` (requires authenticated BTP session). |
| `authenticationMethod` | `"none"` \| `"route"` | `"none"` | Authentication for routes |
| `allowLocalDir` | `boolean` | `false` | Allow approuter to serve static assets (usually ui5-server serves them). |
| `rewriteContent` | `boolean` | `true` | Replace proxied URLs in response body with the server URL |
| `rewriteContentTypes` | `string[]` | `["text/html", "application/json", "application/atom+xml", "application/xml"]` | Content types to rewrite when `rewriteContent` is true |
| `extensions` | `array` | `[]` | Approuter extensions: `{ module: string, parameters?: Record<string, string> }`. Parameters are passed as the 4th argument to extension handlers. |
| `appendAuthRoute` | `boolean` | `false` | Add a route for HTML pages to trigger XSUAA login when `authenticationMethod` is not `"none"`. |
| `disableWelcomeFile` | `boolean` | `false` | Disable welcome file handling from `xs-app.json`. |

## Usage

1. Add the middleware in `ui5.yaml`:

```yaml
server:
  customMiddleware:
    - name: backend-proxy-middleware-cf
      afterMiddleware: compression
      configuration:
        authenticationMethod: "none"
        debug: true
        port: 1091
        xsappJson: "xs-app.json"
        destinations:
          - name: "backend"
            url: "https://your-backend.example/path"
```

2. Place `xs-app.json` at the path you set in `xsappJson` (e.g. project root). Define routes with a `source` regex and `destination` name that matches an entry in `destinations`.

### Env options file (VCAP_SERVICES, credentials)

To run the approuter with BTP-style credentials (e.g. XSUAA, destinations, HTML5 app repo), point `envOptionsPath` to a JSON file. Each top-level key is applied to `process.env` so the approuter can find them; object and array values are stored as JSON strings. The key `destinations` in the file is ignored so that the middleware's `destinations` from ui5.yaml are used.

Example shape (minimal):

```json
{
  "VCAP_SERVICES": {
    "xsuaa": [{ "label": "xsuaa", "credentials": { "clientid": "...", "clientsecret": "...", "url": "..." } }],
    "destination": [{ "label": "destination", "credentials": { ... } }]
  }
}
```

You can export a real `VCAP_SERVICES` (and optionally other keys) from your BTP app and save it to a file (e.g. `.env-options.json`); do not commit secrets. In ui5.yaml set `envOptionsPath: ".env-options.json"`.

### Destinations from .env

In `.env`:

```properties
xsapp_dest = [{"name": "backend", "url": "https://your-backend.example"}]
```

In `ui5.yaml`:

```yaml
configuration:
  destinations: "$env:xsapp_dest"
```

## How it works

The middleware starts a local `@sap/approuter` process with your `xs-app.json` and destinations. The UI5 server proxies requests that match approuter routes (e.g. login callback, welcome file, destination routes) to `http://localhost:<port>`. Response content can be rewritten so that backend URLs in the body are replaced with the server URL for the relevant content types.

## Extensions

You can plug in approuter extensions and pass parameters:

```yaml
configuration:
  extensions:
    - module: ./approuter-local-ext.js
      parameters:
        userId: "user@example.com"
```

In the extension, parameters are available as the 4th argument: `function (req, res, next, params)`.

## Keywords

- UI5 middleware
- Cloud Foundry
- Approuter
- Destination proxy
- SAP BTP
