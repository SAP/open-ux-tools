# Backend Configuration Variants

**Purpose**: Cover backend-config.ts variants (33% → 80%)

**Coverage Target**: 
- src/migration/backend-config.ts lines 28-112
- Different backend URL formats, sap-client handling, protocol variants

## Covered Branches
- extractBackendConfig with various URL formats (lines 35-67)
- sap-client parameter in URL query string (lines 42-48)
- sap-client in neo-app.json destination (lines 51-54)
- URL protocol handling (http vs https) (lines 58-61)
- Port number extraction (lines 63-66)
- Hostname normalization (lines 69-75)
- Multiple destination consolidation (lines 78-95)

## Project Structure
Application with various backend configuration patterns to test URL parsing edge cases.

### Key Files:
- `neo-app.json` - Destination with specific client configuration
- `webapp/manifest.json` - Service URIs with query parameters

## Test Usage
```typescript
const { projectInfo } = await loadOrFetchProjectInfo(
  'test/input/coverage_backend_config_variants'
);
expect(projectInfo.backendInfo.sapClient).toBe('200');
expect(projectInfo.backendInfo.backendUrl).toContain('https://');
```
