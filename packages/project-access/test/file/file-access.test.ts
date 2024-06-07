import { join } from 'path';
import type { Manifest, Package } from '../../src';
import { readFile, readJSON, fileExists, updateManifestJSON, updatePackageJSON, writeFile } from '../../src/file';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { promises } from 'fs';

describe('fileAccess', () => {
    const memFs = create(createStorage());
    const memFilePath = join(__dirname, 'file-access.test.ts.mem');
    const memFileContent = { hello: 'world' };
    memFs.writeJSON(memFilePath, memFileContent);

    describe('readFile', () => {
        test('Read existing file, should return content', async () => {
            const content = await readFile(join(__dirname, 'file-access.test.ts'));
            expect(content).toContain('file-access.test.ts');
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

    describe('writeFile', () => {
        const filePath = join(__dirname, 'write-to-a-file.txt');
        beforeEach(() => {
            jest.resetAllMocks();
            memFs.write(filePath, '');
        });
        test('Write to a file - mem-fs-editor', async () => {
            const content = 'test-data';
            await writeFile(filePath, content, memFs);
            const result = memFs.read(filePath);
            expect(result).toContain(content);
        });
        test('Write to a file', async () => {
            const content = 'test-data';
            const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
            await writeFile(filePath, content);
            expect(writeFileSpy).toHaveBeenNthCalledWith(1, filePath, content, { encoding: 'utf8' });
        });
    });

    describe('fileExists', () => {
        test('Check existing file, should return true', async () => {
            const exists = await fileExists(join(__dirname, 'file-access.test.ts'));
            expect(exists).toBe(true);
        });

        test('Check non existing file, should return false', async () => {
            const exists = await fileExists('DOES_NOT_EXIST');
            expect(exists).toBe(false);
        });

        test('Check existing file in mem-fs, should return true', async () => {
            const exists = await fileExists(memFilePath, memFs);
            expect(exists).toBe(true);
        });
    });

    describe('updatePackageJSON', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        test('Should update package.json using previous indentation with tab space', async () => {
            const updateFileContent = {} as unknown as Package;
            const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
            const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
            const pckgPath = join(__dirname, '..', 'test-data', 'json', 'package', 'package-tab-space.json');
            await updatePackageJSON(pckgPath, updateFileContent);
            expect(jsonStringifySpy).toBeCalledWith(updateFileContent, null, '  ');
            expect(writeFileSpy).toBeCalledWith(pckgPath, '{}\n', { encoding: 'utf8' });
        });
        test('Should update package.json using previous indentation with 1 space', async () => {
            const updateFileContent = {} as unknown as Package;
            const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
            const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
            const pckgPath = join(__dirname, '..', 'test-data', 'json', 'package', 'package-single-space.json');
            await updatePackageJSON(pckgPath, updateFileContent);
            expect(jsonStringifySpy).toBeCalledWith(updateFileContent, null, ' ');
            expect(writeFileSpy).toBeCalledWith(pckgPath, '{}\n', { encoding: 'utf8' });
        });
        test('Should update package.json using previous indentation with 2 spaces', async () => {
            const updateFileContent = {} as unknown as Package;
            const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
            const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
            const pckgPath = join(__dirname, '..', 'test-data', 'json', 'package', 'package-double-space.json');
            await updatePackageJSON(pckgPath, updateFileContent);
            expect(jsonStringifySpy).toBeCalledWith(updateFileContent, null, '  ');
            expect(writeFileSpy).toBeCalledWith(pckgPath, '{}\n', { encoding: 'utf8' });
        });
    });

    describe('updateManifestJSON', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        test('Should update manifest.json using previous indentation 1 space', async () => {
            const updateFileContent = {} as unknown as Manifest;
            const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
            const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
            const manifestPath = join(__dirname, '..', 'test-data', 'json', 'manifest', 'manifest-single-space.json');
            await updateManifestJSON(manifestPath, updateFileContent);
            expect(jsonStringifySpy).toBeCalledWith(updateFileContent, null, ' ');
            expect(writeFileSpy).toBeCalledWith(manifestPath, '{}\n', { encoding: 'utf8' });
        });
        test('Should update manifest.json using previous indentation 2 spaces', async () => {
            const updateFileContent = {} as unknown as Manifest;
            const jsonStringifySpy = jest.spyOn(JSON, 'stringify');
            const writeFileSpy = jest.spyOn(promises, 'writeFile').mockResolvedValue();
            const manifestPath = join(__dirname, '..', 'test-data', 'json', 'manifest', 'manifest-double-space.json');
            await updateManifestJSON(manifestPath, updateFileContent);
            expect(jsonStringifySpy).toBeCalledWith(updateFileContent, null, '  ');
            expect(writeFileSpy).toBeCalledWith(manifestPath, '{}\n', { encoding: 'utf8' });
        });
    });
});
