/**
 * Jest setup file for fiori-mcp-server tests
 * This file runs before all tests to configure the test environment
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Set LOG_LEVEL to 'off' to suppress logging to file during tests
process.env.LOG_LEVEL = 'off';

// Load .env.e2e if present (used by E2E tests)
const envFile = join(process.cwd(), '.env.e2e');
if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        const eq = trimmed.indexOf('=');
        if (eq === -1) {
            continue;
        }
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && !(key in process.env)) {
            process.env[key] = value;
        }
    }
}
