# Comprehensive Type Duplication Analysis - fiori-migration-writer

**Date**: 2026-10-29  
**Scope**: Search for all types in fiori-migration-writer that might exist elsewhere in open-ux-tools

---

## All Types Exported by fiori-migration-writer

### From migration-types.ts (47 types):
1. ODataVersion (const + type)
2. Script (type)
3. SapUxLayer (const + type)
4. PackageJson (interface)
5. DatasourceType (const + type)
6. FLOOR_PLAN (const)
7. FloorPlan (type)
8. Backend (type)
9. NeoappDestination (type)
10. BackendConfig (interface)
11. EntityConfig (interface)
12. ProjectMigrate (interface)
13. PackageJsonMigrate (interface)
14. neoAppJsonRouteTargetTypes (const + type)
15. HasRootIntent (type)
16. ImportProjectInfo (type)
17. MigrationUIProjectInfo (interface)
18. ProjectAppPath (interface)
19. Message (interface)
20. TemplateDataKey (const + type)
21. TemplateProperties (type)
22. TemplateMap (type)
23. TemplateData (interface)
24. MigrationSettingsFile (type)
25. MigratableFolder (type)
26. sapWattCommonSetting (const)
27. Project (interface)
28. Credentials (interface)
29. CapType (const + type)
30. ApiHubType (const + type)
31. ApiHubConfig (interface)
32. CapService (interface)
33. SapSystemSourceType (const + type)
34. Service (interface)
35. ReadMe (interface)
36. Ui5Yaml (interface)
37. Ui5MockYaml (interface)
38. UI5ConfigOptions (interface)
39. BackendConfigOptions (interface)
40. LibraryConfigOptions (interface)
41. Ui5YamlContext (interface)
42. PackageJsonDependencies (interface)
43. FLPConfiguration (interface)
44. PackageJsonFeatureFlags (interface)
45. PackageJsonContext (interface)
46. TemplateAssemblyFlags (interface)
47. TemplateConfigData (interface)
48. TemplateModuleInfo (interface)
49. TemplateAssemblyContext (interface)
50. ProjectDataService (interface)
51. ManifestAnalysisService (interface)
52. BackendConfigService (interface)
53. RegularProjectContext (interface)

### From project-spec-types.ts (8 types):
1. Manifest (re-export from @sap-ux/project-access)
2. ManifestNamespace (re-export from @sap-ux/project-access)
3. FioriElementsVersion (const + type)
4. SapAppSourceTemplate (interface)
5. FileName (const + type)
6. DirName (const + type)
7. Package (interface)
8. SapUi5RoutingTarget (interface)
9. MiddlewareProxy (interface)

### From template-types.ts (3 types):
1. PROJECT_TYPE (const)
2. ProjectType (type) - NEWLY ADDED
3. SapUiLibs (const object)

---

## Search Plan

For each type, I'll search across open-ux-tools packages for:
1. Exact type name matches
2. Similar interfaces/types with same structure
3. Types that could be unified

---

## High-Priority Search Targets

### 1. Package-related types
- Package
- PackageJson
- PackageJsonMigrate

### 2. Layer/Version types
- SapUxLayer / UI5FlexLayer
- ODataVersion
- FioriElementsVersion

### 3. Service types
- Service
- CapService
- CapType

### 4. Config types
- BackendConfig
- UI5ConfigOptions
- ApiHubConfig

### 5. File/Path types
- FileName
- DirName

---

## Executing Searches...
