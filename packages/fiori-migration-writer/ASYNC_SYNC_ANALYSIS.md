# Async/Sync Analysis - Service Interfaces

## Key Finding: Different Architectures

### tools-suite (app-migrator)
- Uses **native Node.js file I/O** (`fs.promises`)
- File operations are **async**
- Service interfaces correctly reflect `Promise<>` returns

### open-ux-tools (fiori-migration-writer)
- Uses **mem-fs-editor** (in-memory file system)
- File operations are **synchronous** (mem-fs reads/writes are sync)
- Service interfaces correctly reflect sync returns

---

## Implementation Evidence

### getPackageJson

**tools-suite** (async):
```typescript
// src/utils/Project.ts
public static getPackageJson(filePath: string): Promise<any> {
    return getPackageJson(filePath);  // Returns Promise from fs.promises
}
```

**open-ux-tools** (sync):
```typescript
// src/utils/project-readers/package-reader.ts
export function getPackageJson(fs: Editor, filePath: string): any {
    return readJSON(fs, getPackageJsonPath(filePath));  // Sync mem-fs operation
}

// src/utils/Project.ts
public static getPackageJson(filePath: string, fsEditor?: Editor): Promise<any> {
    return getPackageJson(fsEditor ?? createMemFsEditor(), filePath);
    // Wraps sync operation in Promise for API consistency
}
```

### getFlpIntentFromHtml

**open-ux-tools** (sync):
```typescript
// src/utils/project-readers/manifest-utils.ts
export function getFlpIntentFromHtml(fs: Editor, htmlFilePath: string): string | undefined {
    if (!fileExists(fs, htmlFilePath)) {
        return undefined;
    }
    const htmlContent = readFile(fs, htmlFilePath);  // Sync mem-fs operation
    return extractFlpIntentFromConfig(htmlContent);
}
```

---

## Type Signature Analysis

### Current Signatures in open-ux-tools

```typescript
export interface ProjectDataService {
    getPackageJson: (projectRoot: string) => any;  // Actually sync
    getMainEntity: (manifest: Manifest) => string;  // Sync
    hasUI5Tooling: (packageJson: any) => boolean;  // Sync
}

export interface BackendConfigService {
    getFirstBackend: (projectRoot: string) => {
        url?: string;
        destination?: string;
        scp?: boolean;
        sapClient?: string;
    };  // Sync
    getFlpIntentFromHtml: (path: string) => string | undefined;  // Sync
    getDestinationFromNeoApp: (
        projectRoot: string,
        destination: string
    ) => Promise<{...} | undefined>;  // Async (special case)
    getClientFromDestinationName: (destination: string) => string;  // Sync
}
```

---

## Verdict

✅ **open-ux-tools signatures are CORRECT** for its mem-fs-based architecture  
✅ **tools-suite signatures are CORRECT** for its fs.promises-based architecture

❌ **They are NOT compatible** - different I/O patterns

---

## Implication for Type Consolidation

The service interface types **cannot be unified** as-is because:
1. tools-suite uses async file I/O (returns `Promise<>`)
2. open-ux-tools uses sync mem-fs I/O (returns directly)

### Options:

#### Option 1: Keep Separate Service Interface Types ✅ RECOMMENDED
- Export core data types from open-ux-tools (Project, Service, BackendConfig, etc.)
- Keep service interfaces separate in each repo
- tools-suite imports data types but defines own service interfaces

#### Option 2: Make All Service Methods Async
- Change open-ux-tools to wrap all returns in `Promise<>`
- Breaking change for existing consumers
- Unnecessary overhead for sync operations

#### Option 3: Generic Service Interfaces
- Use type parameters to support both patterns
- Complex, harder to understand

---

## Recommendation

**Split the types into two groups:**

### Group A: Data Types (consolidate in open-ux-tools) ✅
- `Project`, `ProjectMigrate`
- `Service`, `CapService`, `ApiHubConfig`
- `PackageJson`, `PackageJsonMigrate`
- `ImportProjectInfo`, `MigrationUIProjectInfo`
- `BackendConfig`, `Backend`, `NeoappDestination`
- `Ui5Yaml`, `Ui5MockYaml`
- `ReadMe`
- `TemplateData`, `TemplateProperties`, `TemplateMap`
- `Message`, `Credentials`
- `EntityConfig`
- All const object enums (ODataVersion, SapUxLayer, etc.)

### Group B: Service Interfaces (keep separate per repo) ✅
- `ProjectDataService`
- `ManifestAnalysisService`
- `BackendConfigService`
- `RegularProjectContext` (uses services)
- Context interfaces that include `fs: Editor` field

---

## Action Plan

1. ✅ Consolidate Group A types in open-ux-tools
2. ✅ Keep Group B interfaces in each repo's codebase
3. ✅ tools-suite imports Group A from `@sap-ux/fiori-migration-writer`
4. ✅ tools-suite keeps own service interfaces in local types file
