import { expect, jest, describe, test, it, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Inject Jest globals for tests that don't import from @jest/globals
globalThis.jest = jest;
globalThis.expect = expect;
globalThis.describe = describe;
globalThis.test = test;
globalThis.it = it;
globalThis.beforeAll = beforeAll;
globalThis.afterAll = afterAll;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;

// Provide __dirname and __filename for source files that expect them (CJS globals)
// Note: These will be set relative to this setup file, not the source file
// For proper per-file __dirname, source files should use:
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);
if (typeof globalThis.__filename === 'undefined') {
    globalThis.__filename = fileURLToPath(import.meta.url);
}
if (typeof globalThis.__dirname === 'undefined') {
    globalThis.__dirname = dirname(globalThis.__filename);
}
