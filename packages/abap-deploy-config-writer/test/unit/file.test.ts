import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { addUi5Dependency } from '../../src/file';

describe('File utils', () => {
    test('should return when @ui5/cli version is greater or equal to 3.0.0', () => {
        const fs = create(createStorage());
        jest.spyOn(fs, 'readJSON').mockReturnValue({
            devDependencies: {
                '@ui5/cli': '^3.0.0'
            }
        });
        expect(addUi5Dependency(fs, 'base/path', 'dep')).toBeUndefined();
    });
});
