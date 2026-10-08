# UI5 Library Project

**Purpose**: Cover reuse-library.ts processing (0% → 70%)

**Coverage Target**: 
- src/project/reuse-library.ts lines 35-53
- Processing standalone UI5 library projects
- Package.json with/without UI5 tooling dependencies

## Covered Branches
- processReuseLibrary full flow (lines 35-52)
- package.json exists path (lines 36-38)
- package.json missing catch block (lines 39-42)
- hasUI5Tooling check for libraries
- getReuseLibModuleName extraction
- Library type assignment (MigrationTypes.library)

## Project Structure
This is a standalone UI5 library project (not a reuse library within an app).

### Key Files:
- `src/library.js` - Library initialization
- `package.json` - With UI5 tooling dependencies
- No webapp/ folder (library structure)

## Test Usage
```typescript
const { projectInfo } = await ProjectAccess.getProjectInfo(
  'test/input/coverage_ui5_library_standalone',
  MigrationTypes.library
);
expect(projectInfo.type).toBe(MigrationTypes.library);
expect(projectInfo.isFioriToolsProject).toBe(true);
```
