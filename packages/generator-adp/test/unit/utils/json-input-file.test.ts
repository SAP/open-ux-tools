import { jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readJsonInputFile } from '../../../src/utils/json-input-file.js';

const writtenFiles: string[] = [];

/**
 * Writes a temp-file payload for the given id and tracks it for cleanup.
 *
 * @param {string} id - Temp file id.
 * @param {string} contents - File contents.
 * @returns {Promise<string>} The written file path.
 */
async function writeTempFile(id: string, contents: string): Promise<string> {
    const filePath = join(tmpdir(), `${id}.txt`);
    await fs.writeFile(filePath, contents, 'utf8');
    writtenFiles.push(filePath);
    return filePath;
}

describe('readJsonInputFile', () => {
    afterEach(async () => {
        jest.clearAllMocks();
        await Promise.all(
            writtenFiles.splice(0).map(async (filePath) => {
                await fs.unlink(filePath).catch(() => undefined);
            })
        );
    });

    it('should return undefined when the file is missing', async () => {
        const id = `adp-gen-test-missing-${process.pid}`;

        await expect(readJsonInputFile(id)).resolves.toBeUndefined();
    });

    it('should return the parsed JSON when the file is valid', async () => {
        const id = `adp-gen-test-valid-${process.pid}`;
        const keyUserChanges = [{ content: { fileName: 'id_123_propertyChange', changeType: 'propertyChange' } }];
        await writeTempFile(id, JSON.stringify({ keyUserChanges }));

        await expect(readJsonInputFile(id)).resolves.toEqual({ keyUserChanges });
    });

    it('should allow extra fields on the JSON input file', async () => {
        const id = `adp-gen-test-extra-fields-${process.pid}`;
        const keyUserChanges = [{ content: { fileName: 'id_123_propertyChange', changeType: 'propertyChange' } }];
        await writeTempFile(id, JSON.stringify({ keyUserChanges, extraField: 'ignored' }));

        await expect(readJsonInputFile(id)).resolves.toEqual({ keyUserChanges, extraField: 'ignored' });
    });

    it('should return the parsed file when keyUserChanges is an empty array', async () => {
        const id = `adp-gen-test-empty-${process.pid}`;
        await writeTempFile(id, JSON.stringify({ keyUserChanges: [] }));

        await expect(readJsonInputFile(id)).resolves.toEqual({ keyUserChanges: [] });
    });

    it('should return the parsed file when the payload has no keyUserChanges', async () => {
        const id = `adp-gen-test-no-changes-${process.pid}`;
        await writeTempFile(id, JSON.stringify({}));

        await expect(readJsonInputFile(id)).resolves.toEqual({});
    });

    it('should throw when the file contains malformed JSON', async () => {
        const id = `adp-gen-test-invalid-json-${process.pid}`;
        await writeTempFile(id, '{ not json');

        await expect(readJsonInputFile(id)).rejects.toThrow('Failed to parse JSON input file');
    });

    it('should throw when the file contains valid JSON with the wrong shape', async () => {
        const id = `adp-gen-test-wrong-shape-${process.pid}`;
        await writeTempFile(id, JSON.stringify({ keyUserChanges: 'not an array' }));

        await expect(readJsonInputFile(id)).rejects.toThrow('Invalid JSON input file format');
    });

    it('should throw when the payload is a raw array', async () => {
        const id = `adp-gen-test-raw-array-${process.pid}`;
        await writeTempFile(id, JSON.stringify([{ content: { fileName: 'change' } }]));

        await expect(readJsonInputFile(id)).rejects.toThrow('Invalid JSON input file format');
    });

    it('should throw when reading the file fails', async () => {
        const id = `adp-gen-test-eacces-${process.pid}`;
        await writeTempFile(id, JSON.stringify({}));
        const spy = jest
            .spyOn(fs, 'readFile')
            .mockRejectedValueOnce(Object.assign(new Error('EACCES'), { code: 'EACCES' }));

        await expect(readJsonInputFile(id)).rejects.toThrow('Failed to load JSON input file');
        spy.mockRestore();
    });
});
