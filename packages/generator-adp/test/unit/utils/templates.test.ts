import { jest } from '@jest/globals';
import { join } from 'node:path';
const mockExistsSync = jest.fn() as jest.Mock;

jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync
}));

const { getTemplatesOverwritePath } = await import('../../../src/utils/templates.js');

// Mirror getTemplatesOverwritePath's `__dirname || process.cwd()` resolution
// so this expectation stays correct regardless of whether the jest config
// runs tests as ESM (where __dirname is undefined and the function falls
// back to process.cwd()) or as CJS (where __dirname is the compiled module
// directory). See packages/generator-adp/src/utils/templates.ts.
declare const __dirname: string | undefined;
const moduleDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const expectedPath = join(moduleDir, 'templates');

describe('getTemplatesOverwritePath', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete (globalThis as Record<string, unknown>).__dirname;
    });

    it('should return template path when templates directory exists', () => {
        mockExistsSync.mockReturnValue(true);

        const result = getTemplatesOverwritePath();

        expect(result).toBe(expectedPath);
        expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
        expect(mockExistsSync).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when templates directory does not exist', () => {
        mockExistsSync.mockReturnValue(false);

        const result = getTemplatesOverwritePath();

        expect(result).toBeUndefined();
        expect(mockExistsSync).toHaveBeenCalledWith(expectedPath);
        expect(mockExistsSync).toHaveBeenCalledTimes(1);
    });

    it('should resolve the templates path via __dirname when defined (CJS runtime)', () => {
        // The compiled CJS build runs with Node's `__dirname` global defined.
        // Under ts-jest's ESM transform it is undefined, so we simulate it
        // here to exercise the production code path.
        (globalThis as Record<string, unknown>).__dirname = '/abs/generators/utils';
        mockExistsSync.mockReturnValue(true);

        const result = getTemplatesOverwritePath();

        expect(result).toBe('/abs/generators/utils/templates');
        expect(mockExistsSync).toHaveBeenCalledWith('/abs/generators/utils/templates');
    });
});
