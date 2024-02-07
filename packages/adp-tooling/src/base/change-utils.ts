import { Editor } from 'mem-fs-editor';
import path, { posix } from 'path';

import {
    AnnotationsData,
    FolderTypes,
    AnnotationFileSelectType,
    InboundData,
    AdpProjectData,
    ChangeTypes,
    GeneratorName,
    BaseData,
    InboundContent
} from '../types';
import { existsSync, readFileSync, readdirSync } from 'fs';

type InboundChange = { filePath: string; changeWithInboundId: { content: InboundContent } };

/**
 * Writes annotation changes to the specified project path using the provided `mem-fs-editor` instance.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AnnotationsData} data - The data object containing information about the annotation change.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeAnnotationChange(projectPath: string, data: AnnotationsData, change: object, fs: Editor): void {
    try {
        const { annotationChange, annotationFileName, timestamp } = data;
        const changeFileName = `id_${timestamp}_addAnnotationsToOData.change`;
        const changesFolderPath = path.join(projectPath, FolderTypes.WEBAPP, FolderTypes.CHANGES);
        const manifestFolderPath = path.join(changesFolderPath, FolderTypes.MANIFEST);
        const annotationsFolderPath = path.join(changesFolderPath, FolderTypes.ANNOTATIONS);

        writeChangeToFile(`${manifestFolderPath}/${changeFileName}`, change, fs);

        if (annotationChange.targetAnnotationFileSelectOption === AnnotationFileSelectType.NewEmptyFile) {
            fs.write(`${annotationsFolderPath}/${annotationFileName}`, '');
        } else {
            const selectedDir = annotationChange.targetAnnotationFilePath.replace(`/${annotationFileName}`, '');
            if (selectedDir !== annotationsFolderPath) {
                fs.copy(annotationChange.targetAnnotationFilePath, `${annotationsFolderPath}/${annotationFileName}`);
            }
        }
    } catch (e) {
        throw new Error(`Could not write annotation changes. Reason: ${e.message}`);
    }
}

/**
 * Deletes the specified files from the in-memory file system. This function is typically used for cleanup
 * operations in case of errors or when certain files are no longer needed.
 *
 * @param {string | string[]} filesToDelete - A single file path or an array of file paths to delete.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function cleanupFiles(filesToDelete: string | string[], fs: Editor): void {
    Array.from(filesToDelete).forEach((filePath) => fs.delete(filePath));
}

/**
 * Writes a given change object to a file within a specified folder in the project's 'changes' directory.
 * If an additional subdirectory is specified, the change file is written there.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {object} change - The change data to be written to the file.
 * @param {string} fileName - The name of the file to write the change data to.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @param {string} [dir=''] - An optional subdirectory within the 'changes' directory where the file will be written.
 *
 * @returns {void}
 */
export function writeChangeToFolder(projectPath: string, change: object, fileName: string, fs: Editor, dir = ''): void {
    try {
        let targetFolderPath = path.join(projectPath, FolderTypes.WEBAPP, FolderTypes.CHANGES);

        if (dir) {
            targetFolderPath = targetFolderPath.concat(`/${dir}`);
        }

        writeChangeToFile(`${targetFolderPath}/${fileName}`, change, fs);
    } catch (e) {
        throw new Error(`Could not write change to folder: ${path}. Reason: ${e.message}`);
    }
}

/**
 * Writes a given change object to a specific file path. The change data is stringified to JSON format before
 * writing. This function is used to directly write changes to a file, without specifying a directory.
 *
 * @param {string} path - The root path of the project.
 * @param {object} change - The change data to be written to the file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 */
export function writeChangeToFile(path: string, change: object, fs: Editor): void {
    try {
        fs.writeJSON(path, change);
    } catch (e) {
        throw new Error(`Could not write change to file: ${path}. Reason: ${e.message}`);
    }
}

/**
 * Parses a string into an object.
 *
 * @param {string} str - The string to be parsed into an object. The string should be in the format of object properties without the surrounding braces.
 * @returns {{ [key: string]: string }} An object constructed from the input string.
 * @example
 * // returns { name: "value" }
 * parseStringToObject('"name":"value"');
 */
export function parseStringToObject(str: string): { [key: string]: string } {
    return JSON.parse(`{${str}}`);
}

/**
 * Searches for a change file with a specific inbound ID within a project's change directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {string} inboundId - The inbound ID to search for within change files.
 * @returns {InboundChange} An object containing the file path and the change object with the matching inbound ID.
 * @throws {Error} Throws an error if the change file cannot be read or if there's an issue accessing the directory.
 */
export function findChangeWithInboundId(projectPath: string, inboundId: string): InboundChange {
    let changeObj: any;
    let filePath = '';

    const pathToInboundChangeFiles = path.join(projectPath, '/webapp/changes/manifest');

    if (!existsSync(pathToInboundChangeFiles)) {
        return {
            filePath,
            changeWithInboundId: changeObj
        };
    }

    try {
        readdirSync(pathToInboundChangeFiles, { withFileTypes: true })
            .filter((dirent) => dirent.isFile() && dirent.name.includes('changeInbound'))
            .forEach((file) => {
                const pathToFile = `${pathToInboundChangeFiles}/${file.name}`;
                const change = JSON.parse(readFileSync(pathToFile, 'utf-8'));
                const condition = change.content?.inboundId === inboundId;
                if (condition) {
                    changeObj = change;
                    filePath = pathToFile;
                }
            });

        return {
            filePath,
            changeWithInboundId: changeObj
        };
    } catch (e) {
        throw new Error(`Could not find change with inbound id '${inboundId}'. Reason: ${e.message}`);
    }
}

/**
 * Constructs a generic change object based on provided parameters.
 *
 * @param {T} data - The base data associated with the change, including project data and timestamp.
 * @param {object} content - The content of the change to be applied.
 * @param {GeneratorName} generatorName - The name of the generator creating this change.
 * @param {ChangeTypes} changeType - The type of the change.
 * @returns An object representing the change.
 * @template T - A type parameter extending `BaseData`.
 */
export function getGenericChange<T extends BaseData>(
    data: T,
    content: object,
    generatorName: GeneratorName,
    changeType: ChangeTypes
) {
    const { projectData, timestamp } = data;
    const fileName = `id_${timestamp}`;

    return {
        'fileName': fileName,
        'namespace': posix.join(projectData.namespace, 'changes'),
        'layer': projectData.layer,
        'fileType': 'change',
        'creation': new Date(timestamp).toISOString(),
        'packageName': '$TMP',
        'reference': projectData.id,
        'support': { 'generator': generatorName },
        'changeType': changeType,
        'content': content
    };
}
