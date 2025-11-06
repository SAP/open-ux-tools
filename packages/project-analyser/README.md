# @sap-ux/project-analyser

Utility library for analysing SAP Fiori applications and deriving bill of materials data for downstream tooling.

## Installation

```bash
pnpm add @sap-ux/project-analyser
```

## Usage

The module is currently under active development. A high-level example of the planned API is shown below.

```typescript
import { analyzeApp } from '@sap-ux/project-analyser';

const result = await analyzeApp({ appPath: '/path/to/fiori-app' });
console.log(result.summary);
```

## Integration Notes

- Consumers can invoke the analyser during deployment, quality checks, or documentation flows to capture a bill of materials for Fiori applications.
- The output consolidates insights from manifests and annotation artifacts, enabling clients to enrich reporting or governance workflows.
- Future iterations will expand support for additional templates and data extraction capabilities.

## Contributing

Please refer to the repository guidelines in `docs/Guidelines.md` before opening a pull request.

## License

Apache-2.0, see `LICENSE`.

