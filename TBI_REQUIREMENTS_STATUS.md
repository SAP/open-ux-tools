# TBI Requirements Status Assessment - October 2, 2026

## Requirements from Technical Backlog Item

### ✅ 1. Move @sap/ux-app-migrator to @sap-ux/fiori-migration-writer
**Status:** ✅ **COMPLETE**

- Package exists: `packages/fiori-migration-writer/`
- All tests passing: 154/154 (151 passed, 3 skipped)
- Uses mem-fs fully (as required)
- Ready to sync back to tools-suite

---

### ⚠️ 2. Add MCP tool to migrate using @sap-ux/fiori-migration-writer
**Status:** ❌ **NOT IMPLEMENTED**

**Current State:**
- MCP server exists: `packages/fiori-mcp-server/`
- MCP server does NOT import `@sap-ux/fiori-migration-writer`
- No migration tools found in `packages/fiori-mcp-server/src/tools/`

**What's Missing:**
```typescript
// Expected in packages/fiori-mcp-server/src/tools/migrate-project.ts
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';

export async function migrateProject(params: {
    projectPath: string;
    destination?: string;
    hostname?: string;
    // ...
}) {
    const result = await ProjectMigrator.migrate(...);
    
    // Return messages for follow-on actions
    return {
        success: result.result,
        messages: result.messages, // Can trigger follow-on actions
        followOnActions: [
            result.messages.some(m => m.description.includes('metadata'))
                ? { type: 'fetchMetadata', ... }
                : null,
            // cleanup backends in ui5.yaml
            // etc.
        ].filter(Boolean)
    };
}
```

**User Report:** "The last time I check the MCP commands weren't working properly."

**Action Needed:**
1. Create `packages/fiori-mcp-server/src/tools/migrate-project.ts`
2. Import `@sap-ux/fiori-migration-writer` in MCP server's package.json
3. Register the tool in MCP server's index
4. Implement message parsing for follow-on actions:
   - Fetch metadata when needed
   - Clean up backends in ui5.yaml
   - Suggest next steps based on migration messages
5. Add integration tests
6. Update MCP server documentation

---

### ✅ 3. Add to create CLI as documented option
**Status:** ✅ **COMPLETE**

**Evidence:**
```bash
# CLI command exists
packages/create/src/cli/migrate/index.ts

# Usage documented in README
npx --yes @sap-ux/create@latest migrate [project-path]
```

**Features:**
- ✅ Interactive prompts for missing params
- ✅ Secure input validation (prevents injection attacks)
- ✅ Force flag for re-migration
- ✅ Destination or hostname options
- ✅ Optional client and UI5 version
- ✅ Uses `@sap-ux/fiori-migration-writer`
- ✅ Returns migration messages to user

**Documentation:**
```markdown
## migrate
Migrate legacy WebIDE Fiori project to modern Fiori tools format

Options:
- `-d, --destination <name>` - SAP System destination name
- `-s, --sap-system-name <name>` - SAP System name (alias for destination)
- `-H, --hostname <host>` - Hostname (required if destination not provided)
- `-c, --client <client>` - SAP Client (optional)
- `-u, --ui5-version <version>` - UI5 version (defaults to source project version)
- `-f, --force` - Force migration even if project is already a Fiori tools project
```

---

### ⏳ 4. Testing CLI migration comparing output in tools-suite master
**Status:** ⏳ **PENDING - NOT STARTED**

**What's Needed:**
1. Run migration CLI in open-ux-tools:
   ```bash
   npx @sap-ux/create@latest migrate /path/to/test-project
   ```

2. Run same migration in tools-suite master:
   ```bash
   # Using tools-suite app-migrator
   cd /Users/I320242/Documents/SAPDevelop/tools-suite
   git checkout master
   # Run equivalent migration
   ```

3. Compare outputs:
   - File structure
   - package.json
   - ui5.yaml
   - ui5-local.yaml
   - manifest.json
   - Generated files
   - Migration messages

4. Document differences (if any)

5. Create test matrix:
   | Project Type | Open-UX-Tools Output | Tools-Suite Output | Match? | Notes |
   |--------------|---------------------|-------------------|--------|-------|
   | LROP v2      | ...                | ...               | ✓/✗    | ...   |
   | ALP v2       | ...                | ...               | ✓/✗    | ...   |
   | Freestyle    | ...                | ...               | ✓/✗    | ...   |
   | etc.         | ...                | ...               | ✓/✗    | ...   |

**Test Projects to Use:**
- From `packages/fiori-migration-writer/test/input/`
- tool_suite_beta_lrop_v2_project
- tool_suite_v4_lrop
- webide_v2_ovp_project
- etc.

**Action Needed:**
- Create comparison test script
- Run migrations side-by-side
- Document and fix any discrepancies

---

## Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Move to open-source | ✅ COMPLETE | fiori-migration-writer ready |
| MCP tool integration | ❌ NOT DONE | Need to add to fiori-mcp-server |
| Create CLI | ✅ COMPLETE | Documented and working |
| CLI testing vs master | ⏳ PENDING | Need comparison tests |

---

## Immediate Next Steps (Priority Order)

### 1. Add Migration to MCP Server (High Priority)
**Why:** User reported MCP commands not working properly

**Tasks:**
- [ ] Create `packages/fiori-mcp-server/src/tools/migrate-project.ts`
- [ ] Add `@sap-ux/fiori-migration-writer` dependency to MCP server
- [ ] Implement message parsing for follow-on actions
- [ ] Add MCP tool registration
- [ ] Write integration tests
- [ ] Update MCP documentation
- [ ] Test with Claude Code/AI tools

**Estimate:** 1-2 days

### 2. CLI Output Comparison Testing (Medium Priority)
**Why:** Ensures consistency between open-source and tools-suite

**Tasks:**
- [ ] Create test comparison script
- [ ] Run migrations on sample projects (both repos)
- [ ] Document differences
- [ ] Fix discrepancies (if any)
- [ ] Create automated comparison tests

**Estimate:** 2-3 days

### 3. Sync to Tools-Suite (Low Priority - Already Working)
**Why:** Get latest fixes into tools-suite

**Tasks:**
- [ ] Run sync script
- [ ] Validate tools-suite tests
- [ ] Update tools-suite snapshots if needed

**Estimate:** 1-2 hours

---

## MCP Tool Implementation Plan

### File: `packages/fiori-mcp-server/src/tools/migrate-project.ts`

```typescript
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';
import type { Message } from '@sap-ux/fiori-migration-writer';

interface MigrateProjectParams {
    projectPath: string;
    destination?: string;
    hostname?: string;
    client?: string;
    ui5Version?: string;
    force?: boolean;
}

interface FollowOnAction {
    type: 'fetchMetadata' | 'cleanupBackends' | 'updateDependencies' | 'info';
    description: string;
    params?: Record<string, unknown>;
}

/**
 * Parse migration messages to determine follow-on actions
 */
function analyzeMessages(messages: Message[]): FollowOnAction[] {
    const actions: FollowOnAction[] = [];
    
    for (const msg of messages) {
        // Suggest fetching metadata if service issues detected
        if (msg.description.includes('metadata') || msg.description.includes('service')) {
            actions.push({
                type: 'fetchMetadata',
                description: 'Fetch OData metadata to resolve service configuration',
                params: { reason: msg.description }
            });
        }
        
        // Suggest backend cleanup if multiple backends found
        if (msg.description.includes('multiple backends') || msg.description.includes('ui5.yaml')) {
            actions.push({
                type: 'cleanupBackends',
                description: 'Clean up backend configuration in ui5.yaml',
                params: { reason: msg.description }
            });
        }
        
        // Suggest dependency updates if version issues
        if (msg.description.includes('dependency') || msg.description.includes('version')) {
            actions.push({
                type: 'updateDependencies',
                description: 'Update project dependencies',
                params: { reason: msg.description }
            });
        }
    }
    
    return actions;
}

/**
 * Migrate a Fiori project from WebIDE to modern tools format
 * 
 * @param params - Migration parameters
 * @returns Migration result with messages and suggested follow-on actions
 */
export async function migrateProject(params: MigrateProjectParams) {
    const { projectPath, destination, hostname, client, ui5Version, force } = params;
    
    // Build base URI
    let baseUri = '';
    if (hostname) {
        baseUri = `https://${hostname}`;
    }
    
    // Build UI5 snapshot URL
    const ui5SnapshotUrl = ui5Version ? `https://ui5.sap.com/${ui5Version}` : '';
    
    // Build backend config override
    const backendOverride = client || destination || hostname
        ? {
              ...(client && { sapClient: client }),
              ...(destination && { destination }),
              ...(hostname && { hostname })
          }
        : undefined;
    
    // Execute migration
    const result = await ProjectMigrator.migrate(
        projectPath,
        baseUri,
        ui5SnapshotUrl,
        backendOverride,
        undefined,
        force
    );
    
    // Analyze messages for follow-on actions
    const followOnActions = result.messages ? analyzeMessages(result.messages) : [];
    
    return {
        success: result.result,
        messages: result.messages || [],
        followOnActions,
        summary: {
            filesModified: result.messages?.filter(m => m.type === 'INFO').length || 0,
            warnings: result.messages?.filter(m => m.type === 'WARNING').length || 0,
            errors: result.messages?.filter(m => m.type === 'ERROR').length || 0
        }
    };
}

/**
 * MCP tool schema for migration
 */
export const migrateProjectSchema = {
    name: 'migrate_fiori_project',
    description: 'Migrate a legacy WebIDE Fiori project to modern Fiori tools format. Returns migration results with suggested follow-on actions.',
    inputSchema: {
        type: 'object',
        properties: {
            projectPath: {
                type: 'string',
                description: 'Absolute path to the project to migrate'
            },
            destination: {
                type: 'string',
                description: 'SAP System destination name (optional)'
            },
            hostname: {
                type: 'string',
                description: 'Hostname of the backend system (optional, used if destination not provided)'
            },
            client: {
                type: 'string',
                description: 'SAP client number (optional, e.g., "100")'
            },
            ui5Version: {
                type: 'string',
                description: 'UI5 version to use (optional, e.g., "1.120.0")'
            },
            force: {
                type: 'boolean',
                description: 'Force migration even if project appears already migrated'
            }
        },
        required: ['projectPath']
    }
};
```

### Registration in `packages/fiori-mcp-server/src/tools/index.ts`

```typescript
import { migrateProject, migrateProjectSchema } from './migrate-project.js';

export const tools = [
    // ... existing tools
    {
        schema: migrateProjectSchema,
        handler: migrateProject
    }
];
```

---

## Testing Strategy

### Unit Tests
```typescript
// packages/fiori-mcp-server/test/tools/migrate-project.test.ts
describe('migrateProject MCP tool', () => {
    test('should migrate WebIDE project successfully', async () => {
        const result = await migrateProject({
            projectPath: '/path/to/test-project',
            destination: 'ES5',
            ui5Version: '1.120.0'
        });
        
        expect(result.success).toBe(true);
        expect(result.messages).toBeDefined();
        expect(result.followOnActions).toBeDefined();
    });
    
    test('should suggest follow-on actions based on messages', async () => {
        // Test message parsing logic
    });
});
```

### Integration Tests
```bash
# Test with MCP inspector
cd packages/fiori-mcp-server
pnpm inspector

# Then test migration tool
```

---

## Documentation Updates Needed

### 1. MCP Server README
Add migration tool documentation:

```markdown
## Migration Tool

Migrate legacy WebIDE Fiori projects to modern Fiori tools format.

### Usage with AI Tools

The migration tool returns structured messages that can trigger follow-on actions:

- **fetchMetadata**: When service metadata needs updating
- **cleanupBackends**: When backend configuration needs cleanup
- **updateDependencies**: When dependencies need updating

### Example

\`\`\`typescript
// Call via MCP
const result = await callTool('migrate_fiori_project', {
    projectPath: '/path/to/project',
    destination: 'ES5'
});

// Check follow-on actions
for (const action of result.followOnActions) {
    if (action.type === 'fetchMetadata') {
        // Fetch and update metadata
    }
}
\`\`\`
```

### 2. Create Package README
Update to highlight migration command:

```markdown
## migrate

Migrate legacy WebIDE Fiori project to modern Fiori tools format.

[Full documentation already exists - just need to make it more prominent]
```

---

**Status:** Some requirements complete, MCP integration is the main gap  
**Next Action:** Implement MCP migration tool  
**Blocker:** None - all dependencies ready
