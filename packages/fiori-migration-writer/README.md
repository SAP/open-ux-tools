# @sap-ux/fiori-migration-writer

Writer module for migrating Fiori applications from legacy WebIDE format to modern Fiori tools format.

## Overview

This package provides migration capabilities to convert legacy SAP WebIDE Fiori projects to the modern SAP Fiori tools format. It handles:

- Project structure transformation
- Configuration file updates (manifest.json, ui5.yaml, package.json)
- Template file generation
- TypeScript setup for migrated projects
- Launch configuration generation

## Installation

```bash
npm install @sap-ux/fiori-migration-writer
```

## Usage

```typescript
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';

// Migrate a project
await ProjectMigrator.migrate(projectPath);
```

## API

See TypeScript definitions for full API documentation.

## License

Apache-2.0
