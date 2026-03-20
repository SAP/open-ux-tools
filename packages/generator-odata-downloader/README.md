[![Changelog](https://img.shields.io/badge/changelog-8A2BE2)](https://github.com/SAP/open-ux-tools/blob/main/packages/generator-odata-downloader/CHANGELOG.md) [![Github repo](https://img.shields.io/badge/github-repo-blue)](https://github.com/SAP/open-ux-tools/tree/main/packages/generator-odata-downloader)

# [`@sap-ux/generator-odata-downloader`](https://github.com/SAP/open-ux-tools/tree/main/packages/generator-odata-downloader)

Yeoman generator that downloads OData V4 entity data from a backend service for use with the mock data server. This enables developers to work with realistic data during local development without needing a live backend connection.

## Features

- Downloads entity data based on the application's Fiori Elements configuration (from `@sap/ux-specification`)
- Automatically detects related entities from navigation properties
- Supports value help and external service data downloads
- Filters data using semantic keys with range support (e.g., `1-10`, `A,B,C`)
- Writes data to JSON files compatible with the UI5 mock data server
- Optionally updates local metadata files from the remote service
- Automatically configures mock server settings for external service references

## Requirements

- Node.js >= 20.x
- OData V4 service (V2 is not supported)
- Valid SAP Fiori Elements application with `manifest.json`

## Usage

### With Yeoman

```bash
yo @sap-ux/generator-odata-downloader
```

## Prompts

The generator guides users through the following steps:

1. **Application Selection** - Browse and select the SAP Fiori Elements application folder
2. **System Selection** - Choose the backend system (from saved systems or service destinations)
3. **Service Selection** - Select the OData service to connect to
4. **Update Metadata** - Optionally update the local `metadata.xml` from the remote service
5. **Skip Data Download** - Option to skip entity data download (useful for metadata-only updates)
6. **Key Filters** - Enter values for semantic keys to filter the downloaded data (supports ranges like `1-10` and lists like `A,B,C`)
7. **Toggle Selection** - Reset or restore default entity selections
8. **Related Entity Selection** - Select which related entities (navigation properties) to include
9. **Value Help Selection** - Optionally download value help data for dropdown fields

## Output

The generator writes JSON files to the application's mock data directory (determined from `ui5-mock.yaml` or defaults to `webapp/localService/mockdata/`):

```
webapp/
└── localService/
    ├── mainService/
    │   └── metadata.xml          # Updated if requested
    └── mockdata/
        ├── MainEntity.json
        ├── RelatedEntity1.json
        ├── RelatedEntity2.json
        └── ...
```

For value help data, the generator also:
- Writes external service metadata and data files
- Updates `ui5-mock.yaml` with `resolveExternalServiceReferences` configuration

## Dependencies

This generator relies on several SAP UX Tools packages:

- `@sap-ux/odata-service-inquirer` - System and service selection prompts
- `@sap-ux/project-access` - Application file system access and mock server configuration
- `@sap-ux/axios-extension` - Backend service communication
- `@sap-ux/annotation-converter` - OData metadata parsing
- `@sap-ux/odata-service-writer` - External service metadata writing
- `@sap-ux/mockserver-config-writer` - Mock server configuration updates
- `@sap/ux-specification` - Fiori Elements specification parsing

## License

Read [License](./LICENSE).

## Keywords

SAP Fiori, SAP Fiori tools, OData, Mock Data, Yeoman Generator
