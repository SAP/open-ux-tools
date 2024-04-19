import fs from 'fs';
import { getCapFolderPaths } from '../../src/cap';
import { join } from 'path';

describe('getCapFolderPaths', () => {
    const testCapProject = join(__dirname, 'fixtures/test-cap-project');
    test('should return correct folders from exisiting folders and configs', () => {
        const capPaths = getCapFolderPaths(testCapProject);

        expect(capPaths).toEqual({
            app: 'app/',
            db: 'databases/',
            srv: 'services/'
        });
    });

    test('should not throw error with invalid config', () => {
        jest.spyOn(fs, 'existsSync').mockImplementation(() => {
            throw new Error('Error checking folder');
        });

        const capPaths = getCapFolderPaths(testCapProject);

        expect(capPaths).toEqual({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
    });
});
