import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { JsonInputFile } from '../app/types.js';
import { isJsonInputFile } from './type-guards.js';

/**
 * Reads `{tmpdir}/{id}.txt` if it exists.
 *
 * @param {string} id - Correlation id used as the file name.
 * @returns {Promise<JsonInputFile | undefined>} Parsed JSON, or undefined when the file is missing.
 */
export async function readJsonInputFile(id: string): Promise<JsonInputFile | undefined> {
    const filePath = join(tmpdir(), `${id}.txt`);
    if (!existsSync(filePath)) {
        return undefined;
    }

    let fileContent: string;
    try {
        fileContent = await fs.readFile(filePath, 'utf8');
    } catch {
        throw new Error('Failed to load JSON input file');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(fileContent);
    } catch {
        throw new Error('Failed to parse JSON input file');
    }

    if (!isJsonInputFile(parsed)) {
        throw new Error('Invalid JSON input file format');
    }

    return parsed;
}
