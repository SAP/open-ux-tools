import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getTemplatesOverwritePath } from '../../../src/utils/templates';

jest.mock('fs', () => ({
    existsSync: jest.fn()
}));

const existsSyncMock = existsSync as jest.MockedFunction<typeof existsSync>;

describe('getTemplatesOverwritePath', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return template path when templates directory exists', () => {
        const expectedPath = join(__dirname, '../../../src/utils/templates');
        existsSyncMock.mockReturnValue(true);

        const result = getTemplatesOverwritePath();

        expect(result).toBe(expectedPath);
        expect(existsSyncMock).toHaveBeenCalledWith(expectedPath);
        expect(existsSyncMock).toHaveBeenCalledTimes(1);
    });

    it('should return undefined when templates directory does not exist', () => {
        const expectedPath = join(__dirname, '../../../src/utils/templates');
        existsSyncMock.mockReturnValue(false);

        const result = getTemplatesOverwritePath();

        expect(result).toBeUndefined();
        expect(existsSyncMock).toHaveBeenCalledWith(expectedPath);
        expect(existsSyncMock).toHaveBeenCalledTimes(1);
    });
});
