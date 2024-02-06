import { create as createStorage } from 'mem-fs';
import { create, type Editor } from 'mem-fs-editor';

import { writeAnnotationChange, writeChangeToFolder, writeInboundChange } from '../base/change-helpers';
import type { AnnotationsData, InboundData, GeneratorData } from '../types';
import { FolderTypes, GeneratorType } from '../types';

/**
 * Generates and writes changes to the appropriate folder based on the generator type.
 *
 * This function acts as a dispatcher that calls specific functions to handle writing changes
 * for different generator types. It ensures that the `fs` (file system editor) instance is initialized
 * and then delegates the writing task to the relevant function based on the `type` of change requested.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {T} type - The type of generator, determining how the data is handled and written.
 * @param {GeneratorData<T>} data - The data associated with the change, structured according to the generator type.
 * @param {Editor | null} [fs] - An optional `mem-fs-editor` instance for handling file system operations. If not provided, a new instance will be created.
 * @returns {Promise<Editor>} A promise that resolves with the `mem-fs-editor` instance used for the operation, allowing for further manipulations or committing changes.
 * @template T - A type parameter that extends `GeneratorType`, ensuring type safety between the generator type and the associated data.
 * @example
 * // Assuming `projectPath` is defined and points to the root of your project
 * const editorInstance = await generateChange(projectPath, GeneratorType.ADD_ANNOTATIONS_TO_ODATA, data);
 *
 * // To commit the changes to the disk
 * editorInstance.commit(() => console.log('Changes written to disk'));
 */
export async function generateChange<T extends GeneratorType>(
    projectPath: string,
    type: T,
    data: GeneratorData<T>,
    fs: Editor | null = null
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    switch (type) {
        case GeneratorType.ADD_ANNOTATIONS_TO_ODATA:
            writeAnnotationChange(projectPath, data as AnnotationsData, fs);
            break;
        case GeneratorType.ADD_COMPONENT_USAGES:
        case GeneratorType.ADD_NEW_MODEL:
        case GeneratorType.CHANGE_DATA_SOURCE:
            writeChangeToFolder(projectPath, data.change, data.fileName, fs, FolderTypes.MANIFEST);
            break;
        case GeneratorType.CHANGE_INBOUND:
            writeInboundChange(projectPath, data as InboundData, fs);
            break;

        default:
            throw new Error(`Generator type '${type}' does not exist. Could not write manifest editor changes.`);
    }

    return fs;
}
