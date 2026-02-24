# UI5 YAML Schema Wrapper

UI5 YAML schema wrapper with middleware configuration support for all SAP Fiori tools middlewares.

## Overview

This package provides a consolidated JSON Schema validation for UI5 YAML configuration files, including support for all SAP Fiori tools custom middleware configurations.

## Contents

- **`schema/ux-ui5-tooling-schema.json`** - The main consolidated schema that:
  - References the official UI5 tooling schema
  - Includes all middleware-specific configurations in one file
  - Provides validation for all supported middleware types

Individual middleware schemas (auto-generated during build):
- **`schema/preview-middleware-schema.json`** - Preview middleware configuration
- **`schema/backend-proxy-middleware-schema.json`** - Backend proxy middleware configuration
- **`schema/backend-proxy-middleware-cf-schema.json`** - Cloud Foundry backend proxy configuration
- **`schema/reload-middleware-schema.json`** - Reload middleware configuration
- **`schema/serve-static-middleware-schema.json`** - Serve static middleware configuration
- **`schema/ui5-proxy-middleware-schema.json`** - UI5 proxy middleware configuration
- **`schema/fiori-tools-proxy-schema.json`** - Fiori tools proxy configuration

## Usage

In your `ui5.yaml` file, add the schema reference at the top:

```yaml
# yaml-language-server: $schema=./node_modules/@sap-ux/ui5-yaml-schema-wrapper/schema/ux-ui5-tooling-schema.json

specVersion: '3.0'
metadata:
  name: my-app
server:
  customMiddleware:
    - name: preview-middleware
      afterMiddleware: compression
      configuration:
        flp:
          path: /test/flpSandbox.html
          intent:
            object: myapp
            action: display
          theme: sap_horizon
        debug: true
    
    - name: fiori-tools-proxy
      afterMiddleware: compression
      configuration:
        backend:
          - url: https://my-backend.example.com
            path: /sap
        ui5:
          path:
            - /resources
            - /test-resources
          url: https://ui5.sap.com
```

## Development

### Building

Generate all middleware schemas and merge them into the consolidated schema:

```bash
pnpm run build
```

This runs two steps:
1. **Schema Generation**: Creates individual middleware schemas from TypeScript types using `typescript-json-schema`
2. **Schema Merging**: Combines all individual schemas into `ux-ui5-tooling-schema.json` with proper namespacing

### Testing

Run tests to validate the generated schemas:

```bash
pnpm test
```

Watch mode for development:

```bash
pnpm test:watch
```

#### Sample YAML Files

The `test/` directory contains sample YAML files to test schema validation:

- **`sample-ui5.yaml`** - A valid UI5 YAML configuration demonstrating all available middleware configurations
- **`sample-ui5-invalid.yaml`** - An invalid configuration with intentional errors to test validation warnings

Open these files in VS Code (with the YAML extension) to see IntelliSense and validation in action.

### Local Testing

To test the schema locally in another project:

1. Copy the consolidated schema file to your project:
   ```bash
   cp node_modules/@sap-ux/ui5-yaml-schema-wrapper/schema/ux-ui5-tooling-schema.json ./schema/
   ```

2. Add the schema reference to your `ui5.yaml`:
   ```yaml
   # yaml-language-server: $schema=./schema/ux-ui5-tooling-schema.json
   ```

3. Your IDE (VS Code with YAML extension) should now provide:
   - Autocomplete for configuration properties
   - Validation errors for invalid properties
   - Hover documentation

## Supported Middleware

The consolidated schema supports validation for all SAP Fiori tools middleware:

| Middleware Name | Description |
|----------------|-------------|
| `preview-middleware` | Preview middleware for local development |
| `fiori-tools-preview` | Alias for preview-middleware |
| `backend-proxy-middleware` | Proxy for backend system connections |
| `backend-proxy-middleware-cf` | Cloud Foundry OAuth proxy |
| `reload-middleware` | Live reload functionality |
| `fiori-tools-appreload` | Alias for reload-middleware |
| `serve-static-middleware` | Static file serving |
| `fiori-tools-servestatic` | Alias for serve-static-middleware |
| `ui5-proxy-middleware` | UI5 resources proxy |
| `fiori-tools-proxy` | Combined UI5 and backend proxy |

## Schema Generation Details

### Architecture

The schema generation process consists of two main components:

1. **`schema-generator.ts`**: Generates individual JSON schemas from TypeScript type definitions
   - Uses `typescript-json-schema` to extract types
   - Creates separate schema files for each middleware

2. **`schema-merger.ts`**: Merges all individual schemas into one consolidated file
   - Namespaces all type definitions to avoid conflicts (e.g., `preview_middleware_FlpConfig`)
   - Creates conditional validation based on middleware name
   - References the official UI5 tooling schema

### Why One File?

Having all schemas in a single file (`ux-ui5-tooling-schema.json`) ensures:
- **Reliable Loading**: No issues with external schema references or file paths
- **Better IDE Support**: All validation rules are immediately available
- **Simplified Distribution**: Only one schema file needs to be referenced
- **No Network Dependencies**: All definitions are local, no external HTTP requests

The individual schema files are still generated and kept for reference and debugging purposes.

