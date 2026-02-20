import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { readDirectory, readFile } from '../file';
import { existsSync } from 'node:fs';

/**
 * Reads all flex change files from the changes directory.
 *
 * @param changesPath - path to changes directory.
 * @param memFs - optional mem-fs-editor instance.
 * @returns A promise that resolves to an array of flex change files.
 */
export async function readFlexChanges(changesPath: string, memFs?: Editor): Promise<{ [key: string]: string }> {
    const changes: { [key: string]: string } = {};
    if (existsSync(changesPath)) {
        const files = await readDirectory(changesPath);
        for (const file of files) {
            changes[file] = await readFile(join(changesPath, file), memFs);
        }
    }
    return changes;
}
