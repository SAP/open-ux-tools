# @sap-ux/fiori-tools-analyser

Utility library for analysing SAP Fiori applications and deriving bill of materials data that can be emitted via telemetry during deployment.

## Installation

```bash
pnpm add @sap-ux/fiori-tools-analyser
```

## Usage

The module is currently under active development. A high-level example of the planned API is shown below.

```typescript
import { analyzeApp } from '@sap-ux/fiori-tools-analyser';

const result = await analyzeApp({ appPath: '/path/to/fiori-app' });
console.log(result.summary);
```

## Telemetry Integration Plan

- Telemetry events will follow the naming pattern `@sap/ux-ui5-tooling/FIORI_TOOLS_ANALYSER_ACTIONS` with specific `action` values in `customDimensions` to distinguish datasets (e.g. `listReport`, `objectPage`).
- Common telemetry dimensions such as template identifier, template version, deploy target, and OData source will be populated via the analyser output before emitting events.
- `@sap-ux/deploy-tooling` will trigger the analyser after a successful ABAP deployment to capture bill of materials data alongside the existing `DEPLOY` event.
- `@sap-ux/fiori-mcp-server` will reuse the analyser to enrich deployment operations triggered through the MCP server, ensuring consistent telemetry across local and remote workflows.
- Telemetry events will respect data privacy guidelines and exclude any personal or environment-specific information.

## Contributing

Please refer to the repository guidelines in `docs/Guidelines.md` before opening a pull request.

## License

Apache-2.0, see `LICENSE`.

