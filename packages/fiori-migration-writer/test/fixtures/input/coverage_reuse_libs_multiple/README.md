# Reuse Libraries Test Project

**Purpose**: Cover reuse-library.ts and copy-library.ts (0-15% → 70%)

**Coverage Target**: 
- src/project/reuse-library.ts lines 31-97
- src/files/copy-library.ts lines 23-78
- Multiple reuse library handling
- Different types: Component, Library modules

## Covered Branches
- hasReuseLibraries check (line 31)
- Multiple reuse libraries iteration (lines 35-91)
- componentUsages vs libraries paths (lines 45-57)
- copyLibraryFiles for each library (lines 62-85)
- Library name extraction from path (lines 39-43)
- Manifest parsing for library metadata (lines 68-76)

## Project Structure
Fiori application with multiple reuse libraries (both component-based and library-based).

### Key Files:
- `webapp/manifest.json` - Contains componentUsages and sap.ui5.dependencies.libs with reuse components
- `webapp/reuse/comp1/` - First reuse component
- `webapp/reuse/lib2/` - Second reuse library

## Test Usage
```typescript
const { projectInfo } = await loadOrFetchProjectInfo(
  'test/input/coverage_reuse_libs_multiple'
);
expect(projectInfo.reuseLibraries).toHaveLength(2);
```
