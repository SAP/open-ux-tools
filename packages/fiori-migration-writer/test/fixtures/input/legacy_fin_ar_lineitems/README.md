# Legacy AR Line Items - src/main/webapp Structure

**Purpose**: Test legacy folder structure migration (src/main/webapp → webapp)

**Coverage Target**: 
- src/migration-process/legacy.ts (2.5% → 80%)
- src/migration-process/legacy-helpers.ts (11.76% → 80%)

## Covered Scenarios
- Legacy folder structure with src/main/webapp
- ModulePathForTests.js updates
- QUnit test suite migration
- .gitignore path updates
- neo-app.json path updates
- .che/project.json path updates
- Test HTML file path updates

## Project Structure
WebIDE v2 LROP project with legacy folder structure.

### Key Files:
- `src/main/webapp/` - Legacy webapp location
- `src/test/` - Legacy test location
- `neo-app.json` - Contains reuse library references
- Test files with old path references

## Expected Migration Behavior
- Move src/main/webapp → webapp
- Move src/test → webapp/test
- Update all path references in config files
- Clean up empty src directories
