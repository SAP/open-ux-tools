# Adaptation Project - WebIDE Legacy Format

**Purpose**: Cover adaptation-project.ts and adaptation-project-utils.ts (0% → 60%)

**Coverage Target**: 
- src/project/adaptation-project.ts lines 46-108
- src/utils/project-readers/adaptation-project-utils.ts lines 21-116

## Covered Branches
- checkCheProjectSettings path (lines 46-66)
- JSON.parse of sapWattCommonSetting with uiadaptation (lines 52-59)
- processAdaptationProject full flow (lines 56-100)
- Missing package.json catch block (lines 67-70)
- neoAppData?.destination conditional (lines 94-96)
- getFirstBackend hostname extraction (line 99)

## Project Structure
This is a WebIDE-style adaptation project that extends a base SAP Fiori application.

### Key Files:
- `.che/project.json` - Contains sapWattCommonSetting with uiadaptation metadata
- `webapp/manifest.appdescr_variant` - App descriptor variant pointing to base app
- `webapp/ext/` - Extension controllers/views

## Test Usage
```typescript
const { projectInfo } = await loadOrFetchProjectInfo(
  'test/input/coverage_adaptation_webide_legacy'
);
expect(projectInfo.uiAdaptation).toBeDefined();
expect(projectInfo.moduleName).toBe('com.example.adapted');
```
