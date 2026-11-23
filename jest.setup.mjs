import { expect, jest, describe, test, it, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

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
