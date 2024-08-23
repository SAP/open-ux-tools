import fs from 'fs';
import { getCapFolderPathsSync } from '../../src/';
import { join } from 'path';

describe('getCapFolderPaths', () => {
    const testCapProject = join(__dirname, '../fixtures/test-cap-project');
    test('should return correct folders from exisiting folders and configs', () => {
        const capPaths = getCapFolderPathsSync(testCapProject);

        expect(capPaths).toEqual({
            app: 'app/',
            db: 'databases/',
            srv: 'services/'
        });
    });

    test('should not throw error with invalid config', () => {
        jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
            throw new Error('Error reading config');
        });

        const capPaths = getCapFolderPathsSync(testCapProject);

        expect(capPaths).toEqual({
            app: 'app/',
            db: 'db/',
            srv: 'srv/'
        });
    });
});
