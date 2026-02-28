[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/backend-proxy-middleware-cf/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/backend-proxy-middleware-cf)

# `@sap-ux/backend-proxy-middleware-cf`

UI5 server middleware that uses `@sap/approuter` to make destinations configured in SAP Business Technology Platform (BTP) available for local development. Requests to destination routes are proxied to a local approuter instance via `http-proxy-middleware`.

> **⚠️ Experimental**: This middleware is currently experimental and may be subject to breaking changes or even removal in future versions. Use with caution and be prepared to update your configuration or migrate to alternative solutions if needed.

## Prerequisites

- [@ui5/cli](https://ui5.github.io/cli/) 4.0 or later (specVersion 4.0 and later in `ui5.yaml`)

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
| `envOptionsPath` | `string` | — | Path (relative to project root) to a JSON file. Each top-level key is set on `process.env` (objects/arrays are JSON-stringified) so the approuter can read credentials and services. |
| `destinations` | `array` or `string` | `[]` | List of `{ name, url }` destinations (names must match routes in `xs-app.json`). |
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
        port: 5000
        xsappJsonPath: "./xs-app.json"
        destinations:
          - name: "backend"
            url: "https://your-backend.example/path"
```

2. Point your path to the location of xs-app.json.

### Env options file (VCAP_SERVICES, credentials)

To run the approuter with BTP-style credentials (e.g. XSUAA, destinations), point `envOptionsPath` to a JSON file. Each top-level key is applied to `process.env` so the approuter can find them; object and array values are stored as JSON strings. The key `destinations` in the file is ignored so that the middleware's `destinations` from ui5.yaml are used.

Example shape (minimal):

```json
{
  "VCAP_SERVICES": {
    "xsuaa": [{ "label": "xsuaa", "credentials": { "clientid": "...", "clientsecret": "...", "url": "..." } }],
    "destination": [{ "label": "destination", "credentials": { ... } }]
  }
}
```

You can export a real `VCAP_SERVICES` (and optionally other keys) from your BTP app and save it to a file (e.g. `./default-env.json`); do not commit secrets. In ui5.yaml set `envOptionsPath: "./default-env.json"`.

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
