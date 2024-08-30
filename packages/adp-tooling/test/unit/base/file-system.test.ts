import { getProjectNames, resolveNodeModuleGenerator } from '../../../src';

jest.mock('fs');
jest.mock('path');

describe('getProjectNames', () => {
    const mockDirents = [
        { name: 'app.variant1', isFile: () => false },
        { name: 'app.variant2', isFile: () => false },
        { name: 'document.txt', isFile: () => true },
        { name: 'app.variant3', isFile: () => false }
    ];

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('fs').readdirSync.mockReturnValue(mockDirents);
    });

    it('returns a list of directory names matching the app.variant regex, sorted in reverse', () => {
        const path = '/path/to/projects';
        const result = getProjectNames(path);

        expect(result).toEqual(['app.variant3', 'app.variant2', 'app.variant1']);
    });

    it('handles empty directories', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('fs').readdirSync.mockReturnValue([]);
        const path = '/path/to/empty';

        const result = getProjectNames(path);

        expect(result).toHaveLength(0);
    });
});

describe('resolveNodeModuleGenerator', () => {
    beforeEach(() => {
        jest.resetModules();
        process.env['NODE_PATH'] = '/usr/local/lib:/usr/lib';
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('path').resolve.mockImplementation((...args: string[]) => args.join('/'));
    });

    it('returns undefined when the module cannot be resolved', () => {
        jest.spyOn(require, 'resolve').mockImplementation(() => {
            throw new Error('Module not found');
        });
        expect(resolveNodeModuleGenerator()).toBeUndefined();
    });
});
