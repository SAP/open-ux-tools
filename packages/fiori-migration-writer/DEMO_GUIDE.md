# Demo Guide: @sap-ux/fiori-migration-writer

## Overview

This demo showcases the migration of `@sap/ux-app-migrator` from the internal tools-suite monorepo to the open-source `@sap-ux/fiori-migration-writer` package in open-ux-tools. This migration enables AI use cases and makes the migration tooling publicly available.

**Key Value Propositions:**
- 🌐 **Open Source**: Available to the broader SAP community and external partners
- 🤖 **AI-Ready**: Designed for consumption by AI agents (Claude, Copilot, etc.)
- 📦 **Standalone**: Can be used independently without tools-suite dependencies
- ⚡ **Modern**: ESM-first, Node 22+, TypeScript 5+

---

## Demo Scenarios

### Demo 1: Basic Migration via API (5 minutes)

**What it shows:** How to use the package programmatically to migrate a single Fiori project.

```typescript
import { ProjectMigrator, createMemFsEditor } from '@sap-ux/fiori-migration-writer';

// Create in-memory file system
const fs = createMemFsEditor();

// Migrate a legacy WebIDE project
const { fs: updatedFs, result, messages } = await ProjectMigrator.migrate(
    '/path/to/legacy-webide-project',
    'https://backend.example.com',
    'https://ui5.sap.com',
    undefined,  // optional project info
    undefined,  // optional VS Code context
    false,      // internal flag
    fs
);

// Write changes to disk
await new Promise((resolve, reject) => {
    updatedFs.commit((err) => {
        if (err) reject(err);
        else resolve();
    });
});

if (result) {
    console.log('✅ Migration successful!');
    console.log('Messages:', messages);
} else {
    console.error('❌ Migration failed:', messages);
}
```

**Key Points to Highlight:**
- Mem-fs based (in-memory operations)
- Non-destructive (review changes before committing)
- Returns detailed status and messages

---

### Demo 2: Bulk Migration (5 minutes)

**What it shows:** Migrating multiple projects in parallel.

```typescript
import { BulkProjectMigrator } from '@sap-ux/fiori-migration-writer';

const migrator = new BulkProjectMigrator();

const projects = [
    { rootPath: '/path/to/project1', hostname: 'https://backend.sap.com' },
    { rootPath: '/path/to/project2', hostname: 'https://backend.sap.com' },
    { rootPath: '/path/to/project3', hostname: 'https://backend.sap.com' }
];

const results = await migrator.migrate(
    projects,
    'https://ui5.sap.com'
);

// Process results
results.forEach(({ rootPath, result, messages }) => {
    if (result) {
        console.log(`✅ ${rootPath}: Success`);
    } else {
        console.error(`❌ ${rootPath}: Failed - ${messages.join(', ')}`);
    }
});
```

**Key Points to Highlight:**
- Handles multiple projects
- Parallel processing
- Individual result tracking

---

### Demo 3: AI Agent Integration (10 minutes)

**What it shows:** How an AI agent (Claude) can use this package.

Create a simple MCP server or Claude Code demo:

```typescript
// example-ai-integration.ts
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';
import { readFileSync } from 'fs';

async function aiMigrationFlow() {
    // 1. AI analyzes the project structure
    const manifestPath = '/path/to/project/webapp/manifest.json';
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    
    console.log('🤖 AI Analysis:');
    console.log(`   App Type: ${manifest['sap.app'].type}`);
    console.log(`   UI5 Version: ${manifest['sap.ui5'].dependencies.minUI5Version}`);
    
    // 2. AI determines this is a legacy WebIDE project
    const isLegacy = !manifest['sap.app'].dataSources;
    
    if (isLegacy) {
        console.log('   ⚠️  Legacy WebIDE format detected');
        console.log('   🔄 Initiating migration...');
        
        // 3. AI uses the migration writer
        const { result, messages } = await ProjectMigrator.migrate(
            '/path/to/project',
            'https://backend.example.com',
            'https://ui5.sap.com'
        );
        
        // 4. AI reports results
        if (result) {
            console.log('   ✅ Migration completed successfully');
            console.log('   📝 Generated files:');
            messages.forEach(msg => console.log(`      - ${msg}`));
        }
    }
}
```

**Key Points to Highlight:**
- AI can analyze project structure
- AI can decide when migration is needed
- AI can execute and report on migration
- Perfect for autonomous workflows

---

### Demo 4: Live Migration Demo (15 minutes)

**What it shows:** End-to-end migration with before/after comparison.

**Setup:**
```bash
cd /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer

# Use one of the test projects as demo input
cp -r test/input/webide_freestyle_custom_webapp_path /tmp/demo-project
```

**Demo Script:**

1. **Show the legacy project structure:**
   ```bash
   cd /tmp/demo-project
   tree -L 2
   cat webapp/manifest.json | head -20
   ```
   *Point out: No package.json, no ui5.yaml, old manifest format*

2. **Run the migration:**
   ```typescript
   // demo-migrate.ts
   import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';
   
   const { result, messages } = await ProjectMigrator.migrate(
       '/tmp/demo-project',
       'https://my-backend.sap.com',
       'https://ui5.sap.com/1.120.0'
   );
   
   console.log(result ? '✅ Success' : '❌ Failed');
   messages.forEach(m => console.log(m));
   ```

3. **Show the migrated structure:**
   ```bash
   tree -L 2
   cat package.json
   cat ui5.yaml
   cat webapp/manifest.json | head -30
   ```
   *Point out: Modern structure, ready for Fiori tools*

4. **Verify it works:**
   ```bash
   npm install
   npm run start
   ```
   *Show the running app*

**Key Points to Highlight:**
- Transforms project structure
- Adds modern tooling (package.json, ui5.yaml)
- Updates manifest to current format
- Ready to use with SAP Fiori tools

---

### Demo 5: Test Suite Showcase (5 minutes)

**What it shows:** Comprehensive test coverage and quality.

```bash
cd /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer

# Run tests with coverage
pnpm test -- --coverage

# Show specific test categories
pnpm test -- migration-flow-integration
pnpm test -- security-validation
pnpm test -- library-migration-integration
```

**Key Points to Highlight:**
- 104+ test cases
- Integration tests with real project structures
- Security validation (prevents path traversal, etc.)
- Library migration support
- Snapshot testing for consistent output

---

## Comparison: Old vs New

### Architecture

| Aspect | @sap/ux-app-migrator (old) | @sap-ux/fiori-migration-writer (new) |
|--------|---------------------------|-------------------------------------|
| **Location** | Internal tools-suite monorepo | Open-source open-ux-tools repo |
| **Accessibility** | SAP-internal only | Public GitHub |
| **Module System** | CommonJS | ESM (Native modules) |
| **Dependencies** | Coupled to tools-suite packages | Standalone with public deps |
| **Node Version** | 18+ | 22+ |
| **AI Friendly** | Limited | Designed for AI consumption |

### Key Improvements

1. **Open Source**: Available on npm, GitHub
2. **ESM Native**: Modern module system
3. **Decoupled**: No internal SAP dependencies
4. **Better Docs**: README, Quick Start, API docs
5. **Test Isolation**: Self-contained test projects
6. **Security**: Enhanced validation and sanitization

---

## Demo Setup Instructions

### Prerequisites

1. **Install the package:**
   ```bash
   cd /Users/I320242/Documents/SAPDevelop/open-ux-tools
   pnpm install
   pnpm build --filter fiori-migration-writer
   ```

2. **Verify tests pass:**
   ```bash
   cd packages/fiori-migration-writer
   pnpm test
   ```

3. **Create demo workspace:**
   ```bash
   mkdir -p ~/demo-fiori-migration
   cd ~/demo-fiori-migration
   ```

### Quick Demo Scripts

Create these files in your demo workspace:

**demo-1-basic.mjs:**
```javascript
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';

const { result, messages } = await ProjectMigrator.migrate(
    process.argv[2] || './input-project',
    'https://backend.example.com',
    'https://ui5.sap.com'
);

console.log(result ? '✅ Success' : '❌ Failed');
messages.forEach(m => console.log(`  ${m}`));
```

**demo-2-bulk.mjs:**
```javascript
import { BulkProjectMigrator } from '@sap-ux/fiori-migration-writer';
import { readdir } from 'fs/promises';

const projectsDir = process.argv[2] || './projects';
const dirs = await readdir(projectsDir);

const projects = dirs.map(dir => ({
    rootPath: `${projectsDir}/${dir}`,
    hostname: 'https://backend.example.com'
}));

const migrator = new BulkProjectMigrator();
const results = await migrator.migrate(projects, 'https://ui5.sap.com');

console.log(`\n📊 Migrated ${results.length} projects:`);
results.forEach(({ rootPath, result }) => {
    console.log(`  ${result ? '✅' : '❌'} ${rootPath.split('/').pop()}`);
});
```

---

## Talking Points for Different Audiences

### For Developers:
- "It's now a standalone npm package you can use in any Node.js project"
- "ESM-native, works with modern tooling"
- "Comprehensive API with TypeScript support"
- "Mem-fs based - review changes before writing to disk"

### For AI/Tool Builders:
- "Designed to be consumed by AI agents"
- "Clear, predictable API"
- "Detailed error messages and validation"
- "Works great in automated workflows"

### For Management:
- "Moved from internal to open source"
- "Enables external partners and customers to migrate their apps"
- "Reduces support burden with self-service tooling"
- "Modern architecture, easier to maintain"

### For Community:
- "Now available on npm and GitHub"
- "Apache 2.0 licensed"
- "Contributions welcome"
- "Part of SAP's open-source ecosystem"

---

## Demo Flow (30-minute presentation)

1. **Introduction (2 min)**
   - Why we did this migration
   - Value for SAP and community

2. **Demo 1: Basic API (5 min)**
   - Show code
   - Run migration
   - Show results

3. **Demo 2: Bulk Migration (5 min)**
   - Show parallel processing
   - Highlight scalability

4. **Demo 4: Live Migration (10 min)**
   - Before/after comparison
   - Show running app

5. **Demo 3: AI Integration (5 min)**
   - Show AI agent using the package
   - Highlight autonomous capabilities

6. **Q&A (3 min)**

---

## Success Metrics to Highlight

- ✅ **104+ tests** passing
- ✅ **65%+ code coverage** (target 80%)
- ✅ **Zero critical vulnerabilities**
- ✅ **ESM-native** implementation
- ✅ **Full TypeScript** support
- ✅ **Sanitized test data** (ready for public release)
- ✅ **Apache 2.0 licensed**

---

## Next Steps After Demo

1. **For Internal Teams:**
   - Update tools-suite to consume the new package
   - Deprecate old internal package
   - Update documentation

2. **For Community:**
   - Publish to npm
   - Announce on SAP community
   - Create tutorial blog post
   - Add to SAP Fiori tools documentation

3. **For AI Enablement:**
   - Create MCP server
   - Add to Claude Code examples
   - Document in AI tool registries

---

## Questions to Prepare For

**Q: Why move to open source?**
A: To enable external partners, reduce barriers to adoption, and align with SAP's open-source strategy.

**Q: Will the internal version still work?**
A: Yes, we'll maintain compatibility during transition period, then deprecate it.

**Q: Can this migrate any Fiori app?**
A: It handles WebIDE-era apps and most common patterns. Complex customizations may need manual review.

**Q: Is it production-ready?**
A: Yes, it's the same battle-tested code from tools-suite, now in a standalone package.

**Q: How do I report issues?**
A: Via GitHub issues on the open-ux-tools repository.

---

## Resources

- **Package:** `@sap-ux/fiori-migration-writer`
- **Repository:** https://github.com/SAP/open-ux-tools
- **npm:** (pending publication)
- **Documentation:** See README.md and docs/ folder
- **Quick Start:** QUICK_START_GUIDE.md

---

**Last Updated:** October 21, 2026
