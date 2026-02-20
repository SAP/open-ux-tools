# UI5 YAML Schema Wrapper

UI5 YAML schema wrapper with preview-middleware configuration support.

## Overview

This package provides JSON Schema validation for UI5 YAML configuration files, specifically for the `preview-middleware` and `fiori-tools-preview` custom middleware configurations.

## Contents

- **`schema/ux-ui5-tooling-schema.json`** - The main wrapper schema that extends the base UI5 tooling schema
- **`schema/middleware-config-schema.json`** - Auto-generated JSON Schema from the `MiddlewareConfig` TypeScript type in `@sap-ux/preview-middleware`

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
```

## Development

### Building

Generate the `middleware-config-schema.json` from TypeScript types:

```bash
pnpm run build
```

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

- **`sample-ui5.yaml`** - A valid UI5 YAML configuration demonstrating all available `MiddlewareConfig` properties for both `preview-middleware` and `fiori-tools-preview`
- **`sample-ui5-invalid.yaml`** - An invalid configuration with intentional errors to test validation warnings

Open these files in VS Code (with the YAML extension) to see IntelliSense and validation in action.

### Local Testing

To test the schema locally in another project:

1. Copy both schema files to your project root:
   - `schema/ux-ui5-tooling-schema.json`
   - `schema/middleware-config-schema.json`

2. Add the schema reference to your `ui5.yaml`:
   ```yaml
   # yaml-language-server: $schema=./schema/ux-ui5-tooling-schema.json
   ```

3. Your IDE (VS Code with YAML extension) should now provide:
   - Autocomplete for configuration properties
   - Validation errors for invalid properties
   - Hover documentation

## Supported Middleware Names

The schema supports validation for both:
- `preview-middleware`
- `fiori-tools-preview`

Both middleware names use the same configuration schema derived from the `MiddlewareConfig` type.

## Schema Generation

The schema is automatically generated from the TypeScript types in `@sap-ux/preview-middleware` using `typescript-json-schema`. This ensures the schema stays in sync with the actual type definitions.
