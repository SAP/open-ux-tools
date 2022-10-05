import { join } from 'path';
import type { Package } from '../../src';
import { readFile, readJSON, fileExists } from '../../src/file';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

describe('fileAccess', () => {
    const memFs = create(createStorage());
    const memFilePath = join(__dirname, 'fileAccess.test.ts.mem');
    const memFileContent = { hello: 'world' };
    memFs.writeJSON(memFilePath, memFileContent);

    describe('readFile', () => {
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

        test('Read existing file from mem-fs', async () => {
            const content = await readFile(memFilePath, memFs);
            expect(content).toContain(memFileContent.hello);
        });
    });

    describe('readJSON', () => {
        test('Read existing JSON file, should return JSON content', async () => {
            const packageJson = await readJSON<Package>(join(__dirname, '../../package.json'));
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

        test('Read existing JSON file from mem-fs', async () => {
            const content = await readJSON<typeof memFileContent>(memFilePath, memFs);
            expect(content.hello).toBe(memFileContent.hello);
            expect(content).toEqual(memFileContent);
        });
    });

    describe('fileExists', () => {
        test('Check existing file, should return true', () => {
            expect(fileExists(join(__dirname, 'fileAccess.test.ts'))).resolves.toBe(true);
        });

        test('Check non existing file, should return false', () => {
            expect(fileExists('DOES_NOT_EXIST')).resolves.toBe(false);
        });

        test('Check existing file in memf-fs, should return true', () => {
            expect(fileExists(memFilePath, memFs)).resolves.toBe(true);
        });
    });
});
