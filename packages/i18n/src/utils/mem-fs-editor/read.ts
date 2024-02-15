import { promises } from 'fs';
import type { Editor } from 'mem-fs-editor';

/**
 * Read the entire contents of a file.
 *
 * @param filePath absolute path to a file.
 * @param fs optional `mem-fs-editor` instance. If provided, `read` api of `mem-fs-editor` is used.
 * @returns file content
 */
export async function readFile(filePath: string, fs?: Editor): Promise<string> {
    if (fs) {
        return fs.read(filePath);
    }
    return promises.readFile(filePath, { encoding: 'utf8' });
}
