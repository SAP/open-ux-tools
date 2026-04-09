import { jest } from '@jest/globals';
import { join } from 'node:path';

const mockExistsSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync
}));

const { getTemplatesOverwritePath } = await import('../../../src/utils/templates');

// The source code uses join(__dirname, 'templates') where __dirname comes from globalThis.__dirname
// set by jest.setup.mjs (repo root). Compute the expected path the same way.
const expectedPath = join(globalThis.__dirname, 'templates');

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
