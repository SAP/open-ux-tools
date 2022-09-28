import { Package } from '@sap-ux/project-types';
import { join } from 'path';
import { readFile, readJSON, fileExists } from '../../src/file';

describe('readFile()', () => {
    test('Read existing file, should return content', async () => {
        const content = await readFile(join(__dirname, 'fileAccess.test.ts'));
        expect(content).toContain('fileAccess.test.ts');
    });

    test('Read non existing file, should throw error', async () => {
        try {
            await readFile('NOT_EXISTING_FILE');
            fail(`readFile() should have thrown error but did not`);
        } catch (error) {
            expect(error.toString()).toContain('NOT_EXISTING_FILE');
        }
    });
});

describe('readJSON()', () => {
    test('Read existing JSON file, should return JSON content', async () => {
        const packageJson = await readJSON<Package>(join(__dirname, '..', '..', 'package.json'));
        expect(packageJson.name).toEqual('@sap-ux/project-access');
    });

    test('Read non existing JSON file, should throw error', async () => {
        try {
            await readFile('NOT_EXISTING_JSON_FILE');
            fail(`readJSON() should have thrown error but did not`);
        } catch (error) {
            expect(error.toString()).toContain('NOT_EXISTING_JSON_FILE');
        }
    });
});

describe('fileExists()', () => {
    test('Check existing file, should return true', async () => {
        expect(await fileExists(join(__dirname, 'fileAccess.test.ts'))).toBeTruthy();
    });

    test('Check non existing file, should return false', async () => {
        expect(await fileExists('DOES_NOT_EXIST')).toBeFalsy();
    });
});
