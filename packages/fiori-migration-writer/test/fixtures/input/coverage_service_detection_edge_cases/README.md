# Service Detection Edge Cases

**Purpose**: Cover service-detection.ts edge cases (23% → 75%)

**Coverage Target**: 
- src/utils/service-detection.ts lines 45-143
- Edge cases: multiple dataSources, missing settings, annotations, offline scenarios

## Covered Branches
- Multiple dataSources iteration (lines 52-87)
- Missing settings object handling (lines 59-61)
- odataVersion detection variants (lines 63-69)
- annotations array processing (lines 72-78)
- offline dataSource handling (lines 81-84)
- Default OData version fallback (line 90)
- Service URI normalization (lines 94-108)

## Project Structure
Application with complex service configuration including multiple dataSources, annotations, and offline capabilities.

### Key Files:
- `webapp/manifest.json` - Complex dataSources with mixed OData versions, annotations, offline

## Test Usage
```typescript
const { projectInfo } = await loadOrFetchProjectInfo(
  'test/input/coverage_service_detection_edge_cases'
);
expect(projectInfo.dataSources).toHaveLength(3);
```
