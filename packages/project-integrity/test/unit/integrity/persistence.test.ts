import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { Integrity } from '../../../src/types';

const __testdir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lzString = require('lz-string');

const mockMkdir = jest.fn();
const mockWriteFile = jest.fn();

jest.unstable_mockModule('node:fs/promises', () => ({
    ...(jest.requireActual('node:fs/promises') as object),
    mkdir: mockMkdir,
    writeFile: mockWriteFile
}));

jest.unstable_mockModule('lz-string', () => ({
    default: lzString,
    compressToBase64: lzString.compressToBase64,
    decompressFromBase64: lzString.decompressFromBase64
}));

const { readIntegrityData, writeIntegrityData } = await import('../../../src/integrity/persistence');
const { readFile } = await import('node:fs/promises');

describe('Test readIntegrityData()', () => {
    test('Read integrity data, integrity file does not exist', async () => {
        try {
            await readIntegrityData('none-existing-file');
            expect(false).toBe('readIntegrityData() should have thrown error but did not.');
        } catch (error) {
            expect((error as Error).message).toBe('Integrity file not found at none-existing-file');
        }
    });

    test('Read integrity data, set content should not be possible', async () => {
        const integrityFilePath = join(__testdir, '../../test-input/valid-project/.integrity.json');
        const integrityData = await readIntegrityData(integrityFilePath);
        expect(integrityData.fileIntegrity[0].content).toBe('Just a test file.');
        integrityData.fileIntegrity[0].content = 'set to readonly property should not do anything';
        expect(integrityData.fileIntegrity[0].content).toBe('Just a test file.');
    });

    // Other, valid cases, are tested in project.test.ts
});

describe('Test writeIntegrityData()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Write integrity data, path to integrity data does not exists', async () => {
        const integrityFilePath = join(__testdir, '../../test-input/new-folder/integrity.json');
        const content: Partial<Integrity> = {
            fileIntegrity: [],
            contentIntegrity: []
        };
        await writeIntegrityData(integrityFilePath, content as Integrity);
        expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('new-folder'), { recursive: true });
    });

    test('Read and write integrity data, content should be same', async () => {
        const integrityFilePath = join(__testdir, '../../test-input/valid-fiori-project/.fiori-ai/ai-integrity.json');
        const originalContent = await readFile(integrityFilePath, { encoding: 'utf-8' });
        const content = await readIntegrityData(integrityFilePath);
        await writeIntegrityData(integrityFilePath, content);
        expect(mockWriteFile).toHaveBeenCalledWith(integrityFilePath, originalContent, { encoding: 'utf-8' });
    });

    // Other, valid cases, are tested in project.test.ts
});
