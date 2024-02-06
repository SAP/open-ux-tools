import { Editor } from 'mem-fs-editor';
import path from 'path';

import { AnnotationsData, FolderTypes, AnnotationFileSelectType, InboundData } from '../types';

/**
 * Writes annotation changes to the specified project path using the provided `mem-fs-editor` instance.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {AnnotationsData} data - The data object containing information about the annotation change.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 *
 * @returns {void}
 */
export function writeAnnotationChange(projectPath: string, data: AnnotationsData, fs: Editor): void {
    try {
        const { annotationChange, annotationFileName, change, timestamp } = data;
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
 * Writes inbound changes to the workspace. If the change is associated with an existing inbound configuration,
 * it is written directly to the specified file path. Otherwise, the change is written to a new file in the
 * manifest folder.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {InboundData} data - The data object containing information about the inbound change.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 *
 * @returns {void}
 */
export function writeInboundChange(projectPath: string, data: InboundData, fs: Editor): void {
    const { change, fileName, existingChangeFilePath, isChangeWithInbound } = data;

    if (isChangeWithInbound) {
        writeChangeToFile(existingChangeFilePath, change, fs);
    } else {
        writeChangeToFolder(projectPath, change, fileName, fs, FolderTypes.MANIFEST);
    }
}

/**
 * Deletes the specified files from the in-memory file system. This function is typically used for cleanup
 * operations in case of errors or when certain files are no longer needed.
 *
 * @param {string | string[]} filesToDelete - A single file path or an array of file paths to delete.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 *
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
 * @param {string} path - The file path where the change data will be written.
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
