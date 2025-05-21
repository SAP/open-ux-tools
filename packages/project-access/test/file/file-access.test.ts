import { join } from 'path';
import type { Manifest, Package } from '../../src';
import {
    deleteDirectory,
    deleteFile,
    fileExists,
    readDirectory,
    readFile,
    readJSON,
    updateManifestJSON,
    updatePackageJSON,
    writeFile
} from '../../src/file';
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
        test('Should update package.json using previous indentation with 4 spaces - mem-fs-editor', async () => {
            const updateFileContent = { sapux: true } as unknown as Package;
            const pckgPath = join(__dirname, '..', 'test-data', 'json', 'package', 'package-4-spaces.json');
            memFs.writeJSON(pckgPath, { sapux: false }, undefined, 4);
            await updatePackageJSON(pckgPath, updateFileContent, memFs);
            const result = memFs.read(pckgPath);
            expect(result).toBe(`{\n    "sapux": true\n}\n`);
        });
        test('Should update package.json using previous indentation with tab - mem-fs-editor', async () => {
            const updateFileContent = { sapux: true } as unknown as Package;
            const pckgPath = join(__dirname, '..', 'test-data', 'json', 'package', 'package-tab-spaces.json');
            memFs.writeJSON(pckgPath, { sapux: false }, undefined, '\t');
            await updatePackageJSON(pckgPath, updateFileContent, memFs);
            const result = memFs.read(pckgPath);
            expect(result).toBe(`{\n\t"sapux": true\n}\n`);
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
        test('Should update manifest.json using previous indentation with 4 spaces - mem-fs-editor', async () => {
            const updateFileContent = { 'sap.app': { id: 'single_apps-fiori_elements' } } as unknown as Manifest;
            const manifestPath = join(__dirname, '..', 'test-data', 'json', 'manifest', 'manifest-4-spaces.json');
            memFs.writeJSON(manifestPath, { 'sap.app': { id: 'dummy' } }, undefined, 4);
            await updateManifestJSON(manifestPath, updateFileContent, memFs);
            const result = memFs.read(manifestPath);
            expect(result).toBe(`{\n    "sap.app": {\n        "id": "single_apps-fiori_elements"\n    }\n}\n`);
        });
    });

    describe('deleteFile', () => {
        const filePath = join(__dirname, 'delete-file.txt');
        beforeEach(() => {
            jest.resetAllMocks();
            memFs.write(filePath, '');
        });
        test('Delete file - mem-fs-editor', async () => {
            await deleteFile(filePath, memFs);
            expect(memFs.exists(filePath)).toEqual(false);
        });
        test('Delete file', async () => {
            const unlinkSpy = jest.spyOn(promises, 'unlink').mockResolvedValue();
            await deleteFile(filePath);
            expect(unlinkSpy).toHaveBeenNthCalledWith(1, filePath);
        });
    });

    describe('deleteDirectory', () => {
        const folderPath = join(__dirname, 'delete-folder');
        beforeEach(() => {
            jest.resetAllMocks();
        });
        test('Delete folder - mem-fs-editor', async () => {
            const deleteSpy = jest.spyOn(memFs, 'delete');
            await deleteDirectory(folderPath, memFs);
            expect(deleteSpy).toHaveBeenNthCalledWith(1, folderPath);
        });
        test('Delete folder', async () => {
            const rmSpy = jest.spyOn(promises, 'rm');
            await deleteDirectory(folderPath);
            expect(rmSpy).toHaveBeenNthCalledWith(1, folderPath, { recursive: true, force: true });
        });
    });

    describe('readDirectory', () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });
        test('Read directory', async () => {
            const folderPath = join(__dirname, 'delete-folder');
            const readdirSpy = jest.spyOn(promises, 'readdir').mockResolvedValue([]);
            const files = await readDirectory(folderPath);
            expect(readdirSpy).toHaveBeenNthCalledWith(1, folderPath, { encoding: 'utf8' });
            expect(files).toEqual([]);
        });
    });
});
