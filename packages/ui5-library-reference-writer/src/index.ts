import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { updateManifest, updateYaml } from './helpers';
import type { ReuseLibConfig } from './types';

/**
 * Writes the file updates to the memfs editor instance.
 *
 * @param basePath - the base path of the project
 * @param referenceLibraries - array of reference libraries
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
async function generate(basePath: string, referenceLibraries: ReuseLibConfig[], fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    updateYaml(basePath, referenceLibraries, fs);
    await updateManifest(basePath, referenceLibraries, fs);

    return fs;
}

export { generate };
export { ReuseLibConfig };
