[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/fiori-migration-writer/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-migration-writer)

# [`@sap-ux/fiori-migration-writer`](https://github.com/SAP/open-ux-tools/tree/main/packages/fiori-migration-writer)

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

// Migrate a project using the options object
const { fs: updatedFs, result, messages } = await ProjectMigrator.migrate({
    projectRoot: '/path/to/project',
    baseUri: 'https://backend.example.com',
    ui5SnapshotUrl: 'https://ui5.sap.com/snapshots/1.130.0', // optional
    importProjectInfo: undefined, // optional - partial project information
    vscode: undefined,            // optional - VS Code context
    internalToggle: false,        // optional - enable internal features
    fs: fs,                       // optional - mem-fs editor instance
    strict: false                 // optional - strict validation mode
});

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
    console.log('Messages:', messages);
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
    'https://ui5.sap.com/snapshots/1.130.0' // optional - UI5 snapshot URL
);

// Check individual project results
results.forEach((project, index) => {
    console.log(`Project ${index + 1}:`, project.status);
    if (project.messages?.length > 0) {
        console.log('Messages:', project.messages);
    }
});
```

## API

See TypeScript definitions for full API documentation.

## License

Apache-2.0
