# Legacy Cost Center - src/main/webapp Structure

**Purpose**: Test legacy folder structure migration with different patterns

**Coverage Target**: 
- src/migration-process/legacy.ts (2.5% → 80%)
- src/migration-process/legacy-helpers.ts (11.76% → 80%)

## Covered Scenarios
- Legacy folder structure with src/main/webapp
- Different file organization than fin_ar project
- QUnit test files with different paths
- Cross-navigation configuration
- Multiple reuse libraries

## Project Structure
WebIDE LROP v2 project with cost center management.

### Key Files:
- `src/main/webapp/` - Legacy webapp location
- `src/test/` - Legacy test location  
- `neo-app.json` - Backend configuration

## Expected Migration Behavior
- Move src/main/webapp → webapp
- Move src/test → webapp/test
- Update path references
- Preserve cross-navigation setup
