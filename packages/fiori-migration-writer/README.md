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
import { ProjectMigrator, createMemFsEditor } from '@sap-ux/fiori-migration-writer';

// Create a mem-fs editor instance
const fs = createMemFsEditor();

// Migrate a project
const { fs: updatedFs, result, messages } = await ProjectMigrator.migrate(
    '/path/to/project',
    'https://backend.example.com',
    'https://ui5.sap.com',
    undefined, // optional project info
    undefined, // optional vscode context
    false,     // internal toggle
    fs         // optional fs editor
);

// Commit changes to disk
await new Promise((resolve, reject) => {
    updatedFs.commit((err) => {
        if (err) reject(err);
        else resolve();
    });
});

// Check results
if (result) {
    console.log('Migration successful!');
} else {
    console.error('Migration failed:', messages);
}
```

### Bulk Migration

```typescript
import { BulkProjectMigrator } from '@sap-ux/fiori-migration-writer';

const migrator = new BulkProjectMigrator();
const results = await migrator.migrate(
    [
        { rootPath: '/path/to/project1', hostname: 'https://backend.example.com' },
        { rootPath: '/path/to/project2', hostname: 'https://backend.example.com' }
    ],
    'https://ui5.sap.com'
);
```

## API

See TypeScript definitions for full API documentation.

## License

Apache-2.0
