import { promises } from 'fs';
import type { Editor } from 'mem-fs-editor';

/**
 * Write data to a file.
 *
 * @param filePath absolute path to a file
 * @param content content to write
 * @param fs optional `mem-fs-editor` instance. If provided, `write` api of `mem-fs-editor` is used.
 * @returns string or void
 */
export async function writeFile(filePath: string, content: string, fs?: Editor): Promise<string | void> {
    if (fs) {
        return fs.write(filePath, content);
    }
    return promises.writeFile(filePath, content, { encoding: 'utf8' });
}
