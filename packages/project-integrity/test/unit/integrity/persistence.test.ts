import { mkdir } from 'fs/promises';
import { join } from 'path';
import { readIntegrityData, writeIntegrityData } from '../../../src/integrity/persistence';
import type { Integrity } from '../../../src/types';

jest.mock('fs/promises');

describe('Test readIntegrityData()', () => {
    test('Read integrity data, integrity file does not exist', async () => {
        try {
            await readIntegrityData('none-existing-file');
            expect(false).toBe('readIntegrityData() should have thrown error but did not.');
        } catch (error) {
            expect(error.message).toBe('Integrity file not found at none-existing-file');
        }
    });

    // Other, valid cases, are tested in project.test.ts
});

describe('Test writeIntegrityData()', () => {
    test('Write integrity data, path to integrity data does not exists', async () => {
        const mockedMkdir = mkdir as jest.Mock;
        const integrityFilePath = join(__dirname, '../../test-input/new-folder/integrity.json');
        const content: Partial<Integrity> = {
            fileIntegrity: [],
            contentIntegrity: []
        };
        await writeIntegrityData(integrityFilePath, content as Integrity);
        expect(mockedMkdir).toBeCalledWith(expect.stringContaining('new-folder'), { recursive: true });
    });

    // Other, valid cases, are tested in project.test.ts
});
