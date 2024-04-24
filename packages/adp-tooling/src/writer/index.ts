import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { ProjectGeneratorData, ProjectType } from '../types';
import { WriterFactory } from './projects/writer-factory';

/**
 * Generate files to a structure based on a specified project type.
 *
 * This function initializes the file system editor if not provided, selects the appropriate writer based on the project type,
 * and then invokes the writer's write method to generate the project structure.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {ProjectGeneratorData<T>} data - The data specific to the type of project, containing information necessary for specified project structure.
 * @param {Editor | null} [fs] - The `mem-fs-editor` instance used for file operations.
 * @returns {Promise<Editor>} A promise that resolves to the mem-fs editor instance used for generating project structure, allowing for further operations.
 * @template T - A type parameter extending `ProjectType`, ensuring the function handles a defined set of project types.
 */
export async function generate<T extends ProjectType>(
    projectPath: string,
    data: ProjectGeneratorData<T>,
    fs: Editor | null = null
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const type:ProjectType = data.customConfig?.adp.environment || ProjectType.ON_PREM;

    const writer = WriterFactory.createWriter(type, fs, projectPath);

    await writer.write(data);

    return fs;
}
