import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'node:path';
import { readIntegrityData, writeIntegrityData } from '../../../src/integrity/persistence';
import type { Integrity } from '../../../src/types';

jest.mock('fs/promises', () => ({
    ...jest.requireActual('fs/promises'),
    mkdir: jest.fn(),
    writeFile: jest.fn()
}));

describe('Test readIntegrityData()', () => {
    test('Read integrity data, integrity file does not exist', async () => {
        try {
            await readIntegrityData('none-existing-file');
            expect(false).toBe('readIntegrityData() should have thrown error but did not.');
        } catch (error) {
            expect(error.message).toBe('Integrity file not found at none-existing-file');
        }
    });

    test('Read integrity data, set content should not be possible', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/valid-project/.integrity.json');
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
        const mockedMkdir = mkdir as jest.Mock;
        const integrityFilePath = join(__dirname, '../../test-input/new-folder/integrity.json');
        const content: Partial<Integrity> = {
            fileIntegrity: [],
            contentIntegrity: []
        };
        await writeIntegrityData(integrityFilePath, content as Integrity);
        expect(mockedMkdir).toHaveBeenCalledWith(expect.stringContaining('new-folder'), { recursive: true });
    });

    test('Read and write integrity data, content should be same', async () => {
        const mockedWriteFile = writeFile as jest.Mock;
        const integrityFilePath = join(__dirname, '../../test-input/valid-fiori-project/.fiori-ai/ai-integrity.json');
        const originalContent = await readFile(integrityFilePath, { encoding: 'utf-8' });
        const content = await readIntegrityData(integrityFilePath);
        await writeIntegrityData(integrityFilePath, content);
        expect(mockedWriteFile).toHaveBeenCalledWith(integrityFilePath, originalContent, { encoding: 'utf-8' });
    });

    // Other, valid cases, are tested in project.test.ts
});
