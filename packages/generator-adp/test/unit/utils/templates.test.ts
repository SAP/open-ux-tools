import { jest } from '@jest/globals';
import { join } from 'node:path';
const mockExistsSync = jest.fn() as jest.Mock;

jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync
}));

const { getTemplatesOverwritePath } = await import('../../../src/utils/templates.js');

// In the published CJS build, `getTemplatesOverwritePath` resolves the
// templates folder relative to the compiled module (`generators/utils/`).
// Under ts-jest's ESM test transform `__dirname`/`__filename` are not
// defined, so the implementation falls back to `process.cwd()` and the
// expected path is the package root joined with `templates`.
const expectedPath = join(process.cwd(), 'templates');

describe('getTemplatesOverwritePath', () => {
    beforeEach(() => {
        jest.clearAllMocks();
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
});
