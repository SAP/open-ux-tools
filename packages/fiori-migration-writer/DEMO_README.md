# Running the Demos

Quick guide to run the migration demos.

## Setup

1. **Build the package:**
   ```bash
   cd /Users/I320242/Documents/SAPDevelop/open-ux-tools/packages/fiori-migration-writer
   pnpm install
   pnpm build
   ```

2. **Verify tests pass (optional):**
   ```bash
   pnpm test
   ```

## Demo 1: Basic Migration

Migrate a single project (in-memory, non-destructive):

```bash
node demo-basic.mjs ./test/input/reuse_library_project
```

With custom backend and UI5 URLs:
```bash
node demo-basic.mjs ./test/input/reuse_library_project \
    https://my-backend.sap.com \
    https://ui5.sap.com/1.120.0
```

**What you'll see:**
- Migration steps
- Success/failure status
- Changed files (in-memory)
- Execution time

## Demo 2: Bulk Migration

Migrate all test projects:

```bash
node demo-bulk.mjs
```

With custom UI5 URL:
```bash
node demo-bulk.mjs https://ui5.sap.com/1.120.0
```

**What you'll see:**
- Project discovery
- Migration progress
- Per-project results
- Summary statistics

## Demo 3: Programmatic Usage

Create your own script:

```javascript
// my-demo.mjs
import { ProjectMigrator } from '@sap-ux/fiori-migration-writer';

const { result, messages } = await ProjectMigrator.migrate(
    './path/to/project',
    'https://backend.example.com',
    'https://ui5.sap.com'
);

console.log(result ? 'Success!' : 'Failed:', messages);
```

Run it:
```bash
node my-demo.mjs
```

## Available Test Projects

Located in `test/input/`:

1. **reuse_library_project** - Simple reuse library
2. **webide_freestyle_custom_webapp_path** - Custom webapp path
3. **webide_v2_lrop_reuselib_ui5_tooling_routing_project** - Complex routing
4. **CA_FIORI_INBOXExtension** - Adaptation project
5. More...

## Troubleshooting

### "Cannot find module"
Make sure you've run `pnpm build` first.

### "Project not found"
Check the path is relative to the current directory or use an absolute path.

### "Migration failed"
Check the error messages - some projects may have prerequisites.

## Next Steps

- See [DEMO_GUIDE.md](./DEMO_GUIDE.md) for full presentation guide
- See [README.md](./README.md) for API documentation
- See [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) for development workflow
