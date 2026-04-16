import { jest } from '@jest/globals';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mockExistsSync = jest.fn();

jest.unstable_mockModule('node:fs', () => ({
    existsSync: mockExistsSync
}));

const { getTemplatesOverwritePath } = await import('../../../src/utils/templates');

// The source code derives __dirname from import.meta.url, so compute
// the expected path relative to the actual source file location.
const srcUtilsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'src', 'utils');
const expectedPath = join(srcUtilsDir, 'templates');

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
