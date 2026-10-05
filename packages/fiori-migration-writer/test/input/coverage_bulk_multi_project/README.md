# Bulk Multi-Project Migration Test

**Purpose**: Cover BulkProjectMigrator's sequential migration flow with multiple projects.

**Coverage Target**: BulkProjectMigrator.ts lines 9-155 (0% → 80%)

## Covered Branches
- Sequential iteration through multiple projects (lines 33-36)
- fs.commit callback with success/error paths (lines 67-75)
- addProjectToWorkspace VS Code integration (lines 80-100)
- determineStatus for SUCCESS/WARNING/ERROR cases (lines 142-156)
- Success message path (lines 125-131)

## Project Structure

### project1_simple
- Valid simple LROP v4 app
- Expected result: SUCCESS status

### project2_with_warning
- Valid app but missing UI5 tooling dependencies
- Expected result: WARNING status

### project3_error
- Invalid structure (no manifest.json)
- Expected result: ERROR status

## Test Usage
```typescript
const migrator = new BulkProjectMigrator();
const results = await migrator.migrate([
  { rootPath: 'project1_simple', hostname: 'https://dummy.example.com' },
  { rootPath: 'project2_with_warning', hostname: 'https://dummy.example.com' },
  { rootPath: 'project3_error', hostname: 'https://dummy.example.com' }
], 'https://ui5.sap.com');
```
