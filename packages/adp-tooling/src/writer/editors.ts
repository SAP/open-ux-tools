import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import type { GeneratorData, ChangeType } from '../types';
import { WriterFactory } from './changes/writer-factory';

/**
 * Generates and applies changes to a project based on a specified generator type.
 *
 * This function initializes the file system editor if not provided, selects the appropriate writer based on the generator type,
 * and then invokes the writer's write method to apply changes. The changes are made in-memory and need to be committed
 * to be reflected on the disk.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {T} type - The type of generator.
 * @param {GeneratorData<T>} data - The data specific to the type of generator, containing information necessary for making changes.
 * @param {Editor | null} [fs] - The `mem-fs-editor` instance used for file operations.
 * @returns {Promise<Editor>} A promise that resolves to the mem-fs editor instance used for making changes, allowing for further operations or committing changes to disk.
 * @template T - A type parameter extending `ChangeType`, ensuring the function handles a defined set of generator types.
 */
export async function generateChange<T extends ChangeType>(
    projectPath: string,
    type: T,
    data: GeneratorData<T>,
    fs: Editor | null = null
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const writer = WriterFactory.createWriter<T>(type, fs, projectPath);

    await writer.write(data);

    return fs;
}
