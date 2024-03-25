import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';

/**
 * Writes the adp-project template to the mem-fs-editor instance.
 *
 * @param basePath - the base path
 * @param config - the writer configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function generateEnv(basePath: string, data: any, fs: Editor | null = null): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    fs.write(join(basePath, '.env'), data);

    return fs;
}
