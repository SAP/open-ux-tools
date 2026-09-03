import { jest } from '@jest/globals';

// Mock @vscode-logging/logger - CJS module that doesn't provide ESM named exports
// This must run before any source imports that transitively use this module
jest.unstable_mockModule('@vscode-logging/logger', () => ({
    getExtensionLogger: jest.fn().mockReturnValue({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        getChildLogger: jest.fn().mockReturnValue({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn()
        })
    })
}));
