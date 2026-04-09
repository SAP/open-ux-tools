import { expect, jest, describe, test, it, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

globalThis.jest = jest;
globalThis.expect = expect;
globalThis.describe = describe;
globalThis.test = test;
globalThis.it = it;
globalThis.beforeAll = beforeAll;
globalThis.afterAll = afterAll;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;

// Set __dirname to src/ of this package so that source code using
// __dirname (e.g., getTemplatePath in utils.ts) resolves correctly.
// Test files that need __dirname must define it locally using import.meta.url.
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.__dirname = join(pkgRoot, 'src');
globalThis.__filename = join(pkgRoot, 'src', 'index.ts');
