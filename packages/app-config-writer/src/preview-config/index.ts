import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

/**
 * Converts the local preview files of a project to virtual files.
 *
 * @param basePath - base path to be used for the conversion
 * @param fs - file system reference
 * @returns file system reference
 */
export async function convertToVirtualPreview(basePath: string, fs?: Editor): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    //todo: implement the function logic
    return fs;
}
