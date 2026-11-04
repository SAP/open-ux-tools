# Legacy NEO Application with neo-app.json

**Purpose**: Cover legacy-migration.ts (2-12% → 70%)

**Coverage Target**: 
- src/migration/legacy-migration.ts lines 23-89
- processLegacyConfig flow
- extractBackendInfoFromNeoApp parsing
- NEO destination handling

## Covered Branches
- neo-app.json exists and is parsed (lines 31-45)
- destination object with url/host extraction (lines 41-43)
- routes array processing (lines 47-58)
- target.type === 'destination' path (line 50)
- Multiple destination merging logic (lines 54-57)
- sap-client parameter extraction (lines 62-67)
- Legacy configuration consolidation (lines 73-85)

## Project Structure
Legacy NEO-deployed Fiori app with neo-app.json configuration for routing and destinations.

### Key Files:
- `neo-app.json` - NEO application router configuration with destinations
- `webapp/manifest.json` - Standard Fiori manifest
- `package.json` - Basic project metadata

## Test Usage
```typescript
const { projectInfo } = await loadOrFetchProjectInfo(
  'test/input/coverage_legacy_neo_app'
);
expect(projectInfo.backendInfo).toBeDefined();
expect(projectInfo.backendInfo.backendUrl).toBe('https://legacy.dummy.example.com:443');
```
