# Migration Traceability

## Overview

The `sap-ux migrate` command includes built-in traceability to capture migration execution details. After each migration, a detailed log file is automatically written to the user's `.fioritools/migration-logs` directory.

## Log Location

Migration logs are stored in:
- **macOS/Linux**: `~/.fioritools/migration-logs/`
- **Windows**: `%USERPROFILE%\.fioritools\migration-logs\`

## Log Format

Each migration generates a JSON log file with the following naming convention:
```
<project-name>_<timestamp>.json
```

Example: `my-fiori-app_2026-10-15T14-30-45-123.json`

## Log Contents

The migration log contains:

```json
{
  "timestamp": "2026-10-15T14:30:45.123Z",
  "projectPath": "/absolute/path/to/project",
  "projectName": "my-fiori-app",
  "migrationMessages": [
    {
      "type": "INFO",
      "description": "Migration message details"
    },
    {
      "type": "WARNING",
      "description": "Warning message"
    },
    {
      "type": "ERROR",
      "description": "Error message"
    }
  ],
  "npmInstall": {
    "success": true,
    "warnings": [
      "npm WARN deprecated package@1.0.0: This package is deprecated"
    ],
    "securityWarnings": [
      "found 3 vulnerabilities (1 moderate, 2 high)"
    ]
  },
  "migrationSuccess": true
}
```

### Fields

- **timestamp**: ISO 8601 timestamp when migration started
- **projectPath**: Absolute path to the migrated project
- **projectName**: Name of the project directory
- **migrationMessages**: Array of messages from the migration writer
  - **type**: `INFO`, `WARNING`, or `ERROR`
  - **description**: Message text
- **npmInstall**: npm install execution details (only if install was run)
  - **success**: Boolean indicating if npm install succeeded
  - **errors**: Array of error messages (only present if install failed)
  - **warnings**: Array of warning messages (only present if warnings occurred)
  - **securityWarnings**: Array of security vulnerability messages (only present if found)
- **migrationSuccess**: Boolean indicating overall migration result

## Usage

Migration logs are created automatically - no configuration needed. After running:

```bash
sap-ux migrate /path/to/project
```

The CLI will output:
```
Migration log written to: /Users/username/.fioritools/migration-logs/my-project_2026-10-15T14-30-45-123.json
Migration log location: /Users/username/.fioritools/migration-logs
```

## Benefits

1. **Audit Trail**: Complete record of what happened during migration
2. **Debugging**: Errors, warnings, and security issues from npm install help diagnose problems
3. **Repeatability**: Each migration run creates a separate log
4. **Project Isolation**: Logs are organized by project name and timestamp
5. **Concise**: Only captures important information (errors/warnings), not verbose output

## Viewing Logs

### Command Line
```bash
# View latest migration log
cat ~/.fioritools/migration-logs/my-project_*.json | tail -n 1

# Pretty print JSON
cat ~/.fioritools/migration-logs/my-project_2026-10-15T14-30-45-123.json | jq .
```

### Programmatically
```typescript
import { readFileSync, readdirSync } from 'node:fs';
import { join, homedir } from 'node:path';

const logsDir = join(homedir(), '.fioritools', 'migration-logs');
const logFiles = readdirSync(logsDir)
  .filter(f => f.startsWith('my-project_'))
  .sort()
  .reverse();

const latestLog = JSON.parse(
  readFileSync(join(logsDir, logFiles[0]), 'utf-8')
);

console.log('Migration succeeded:', latestLog.migrationSuccess);
console.log('Messages:', latestLog.migrationMessages);
```

## Log Retention

Migration logs are not automatically deleted. Users should periodically clean up old logs:

```bash
# Remove logs older than 30 days (macOS/Linux)
find ~/.fioritools/migration-logs -name "*.json" -mtime +30 -delete

# Remove all logs for a specific project
rm ~/.fioritools/migration-logs/my-project_*.json
```

## Privacy & Security

Migration logs contain:
- File paths
- Project structure information
- npm package names and versions
- Migration warnings/errors

Logs **do not** contain:
- User credentials
- Backend system passwords
- SAP client secrets
- Source code content

Logs are stored locally and never transmitted externally.

## Troubleshooting

### Log directory not created
The directory is created automatically on first migration. If you see a warning, check file system permissions for the home directory.

### Logs not written
If migration logs are not being created, check:
1. Disk space availability
2. Write permissions on `~/.fioritools/`
3. Console output for warnings about log write failures

The migration will continue even if log writing fails - it will only log a warning.

## Implementation

See:
- [`packages/create/src/cli/migrate/traceability.ts`](src/cli/migrate/traceability.ts) - Log writing implementation
- [`packages/create/src/cli/migrate/index.ts`](src/cli/migrate/index.ts) - Migration command integration
- [`packages/create/test/unit/cli/migrate-traceability.test.ts`](test/unit/cli/migrate-traceability.test.ts) - Unit tests
