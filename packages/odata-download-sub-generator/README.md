[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/odata-download-sub-generator/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/odata-download-sub-generator)

# [`@sap-ux/generator-odata-downloader`](https://github.com/SAP/open-ux-tools/tree/main/packages/odata-download-sub-generator)

Yeoman generator that downloads OData entity data from a backend service for use with the mock data server. This enables developers to work with realistic data during local development without needing a live backend connection.

## Features

- Downloads entity data based on the application's Fiori Elements configuration
- Automatically detects related entities from navigation properties
- Supports value help and code list data downloads
- Filters data using semantic keys with range support (e.g., `1-10`, `A,B,C`)
- Writes data to JSON files compatible with the UI5 mock data server
- Updates local metadata files from the remote service

## Usage

### With Yeoman

```bash
yo @sap-ux/odata-downloader
```

### Programmatic Usage

```typescript
import { ODataDownloadGenerator } from '@sap-ux/generator-odata-downloader';

// The generator is typically invoked through Yeoman or SAP Fiori tools
// It provides an interactive prompt-based workflow to:
// 1. Select a Fiori Elements application
// 2. Connect to the backend system
// 3. Enter filter criteria for the main entity
// 4. Select related entities to include
// 5. Download and write the data files
```

## Prompts

The generator guides users through the following steps:

1. **Application Selection** - Select the Fiori Elements application to download data for
2. **System Selection** - Choose the backend system (from saved systems or destinations)
3. **Key Filters** - Enter values for semantic keys to filter the downloaded data
4. **Entity Selection** - Select which related entities (navigation properties) to include
5. **Value Help Selection** - Optionally download value help data for dropdown fields
6. **Confirm Download** - Preview and confirm the data download

## Output

The generator writes JSON files to the application's mock data directory (typically `webapp/localService/mockdata/`):

```
webapp/
└── localService/
    └── mockdata/
        ├── MainEntity.json
        ├── RelatedEntity1.json
        ├── RelatedEntity2.json
        └── ...
```

## Dependencies

This generator relies on several SAP UX Tools packages:

- `@sap-ux/odata-service-inquirer` - System and service selection prompts
- `@sap-ux/project-access` - Application file system access
- `@sap-ux/axios-extension` - Backend service communication
- `@sap-ux/annotation-converter` - OData metadata parsing

## License

Read [License](./LICENSE).

## Keywords

SAP Fiori
SAP Fiori tools
OData
Mock Data
Yeoman Generator
