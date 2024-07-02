import type { Dirent } from 'fs';
import path from 'path';
import type { Editor } from 'mem-fs-editor';
import { existsSync, readFileSync, readdirSync } from 'fs';

import { DirName } from '@sap-ux/project-access';
import type {
    AnnotationsData,
    ChangeType,
    DescriptorVariant,
    InboundContent,
    ManifestChangeProperties,
    PropertyValueType
} from '../types';

export type ChangeMetadata = Pick<DescriptorVariant, 'reference' | 'layer' | 'namespace'>;

type InboundChangeData = { filePath: string; changeWithInboundId: InboundChange | undefined };
interface InboundChange extends ManifestChangeProperties {
    content: InboundContent;
}

/**
 * Writes annotation changes to the specified project path using the provided `mem-fs-editor` instance.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {number} timestamp - The timestamp of the change.
 * @param {AnnotationsData} data - The data object containing information about the annotation change.
 * @param {ManifestChangeProperties} change - The annotation data change that will be written.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @returns {void}
 */
export function writeAnnotationChange(
    projectPath: string,
    timestamp: number,
    data: AnnotationsData,
    change: ManifestChangeProperties,
    fs: Editor
): void {
    try {
        const { fileName, answers } = data;
        const changeFileName = `id_${timestamp}_addAnnotationsToOData.change`;
        const changesFolderPath = path.join(projectPath, DirName.Webapp, DirName.Changes);
        const changeFilePath = path.join(changesFolderPath, DirName.Manifest, changeFileName);
        const annotationsFolderPath = path.join(changesFolderPath, DirName.Annotations);

        writeChangeToFile(changeFilePath, change, fs);

        if (!answers.filePath) {
            fs.write(path.join(annotationsFolderPath, fileName ?? ''), '');
        } else {
            const selectedDir = path.dirname(answers.filePath);
            if (selectedDir !== annotationsFolderPath) {
                fs.copy(answers.filePath, path.join(annotationsFolderPath, fileName ?? ''));
            }
        }
    } catch (e) {
        throw new Error(`Could not write annotation changes. Reason: ${e.message}`);
    }
}

/**
 * Writes a given change object to a file within a specified folder in the project's 'changes' directory.
 * If an additional subdirectory is specified, the change file is written there.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {ManifestChangeProperties} change - The change data to be written to the file.
 * @param {string} fileName - The name of the file to write the change data to.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 * @param {string} [dir] - An optional subdirectory within the 'changes' directory where the file will be written.
 * @returns {void}
 */
export function writeChangeToFolder(
    projectPath: string,
    change: ManifestChangeProperties,
    fileName: string,
    fs: Editor,
    dir = ''
): void {
    try {
        let targetFolderPath = path.join(projectPath, DirName.Webapp, DirName.Changes);

        if (dir) {
            targetFolderPath = path.join(targetFolderPath, dir);
        }

        const filePath = path.join(targetFolderPath, fileName);
        writeChangeToFile(filePath, change, fs);
    } catch (e) {
        throw new Error(`Could not write change to folder. Reason: ${e.message}`);
    }
}

/**
 * Writes a given change object to a specific file path. The change data is stringified to JSON format before
 * writing. This function is used to directly write changes to a file, without specifying a directory.
 *
 * @param {string} path - The root path of the project.
 * @param {ManifestChangeProperties} change - The change data to be written to the file.
 * @param {Editor} fs - The `mem-fs-editor` instance used for file operations.
 */
export function writeChangeToFile(path: string, change: ManifestChangeProperties, fs: Editor): void {
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
 * Attempts to parse a property value as JSON.
 *
 * @param {string} propertyValue - The property value to be parsed.
 * @returns {PropertyValueType} The parsed value if `propertyValue` is valid JSON; otherwise, returns the original `propertyValue`.
 * @example
 * // Returns the object { key: "value" }
 * getParsedPropertyValue('{"key": "value"}');
 *
 * // Returns the string "nonJSONValue" because it cannot be parsed as JSON
 * getParsedPropertyValue('nonJSONValue');
 */
export function getParsedPropertyValue(propertyValue: PropertyValueType): PropertyValueType {
    try {
        const value = JSON.parse(propertyValue);
        return value;
    } catch (e) {
        return propertyValue;
    }
}

/**
 * Searches for a change file with a specific inbound ID within a project's change directory.
 *
 * @param {string} projectPath - The root path of the project.
 * @param {string} inboundId - The inbound ID to search for within change files.
 * @returns {InboundChangeData} An object containing the file path and the change object with the matching inbound ID.
 * @throws {Error} Throws an error if the change file cannot be read or if there's an issue accessing the directory.
 */
export function findChangeWithInboundId(projectPath: string, inboundId: string): InboundChangeData {
    let changeObj: InboundChange | undefined;
    let filePath = '';

    const pathToInboundChangeFiles = path.join(projectPath, DirName.Webapp, DirName.Changes, DirName.Manifest);

    if (!existsSync(pathToInboundChangeFiles)) {
        return {
            filePath,
            changeWithInboundId: changeObj
        };
    }

    try {
        const files: Dirent[] = readdirSync(pathToInboundChangeFiles, { withFileTypes: true }).filter(
            (dirent) => dirent.isFile() && dirent.name.includes('changeInbound')
        );

        for (const file of files) {
            const pathToFile = path.join(pathToInboundChangeFiles, file.name);
            const change: InboundChange = JSON.parse(readFileSync(pathToFile, 'utf-8'));

            if (change.content?.inboundId === inboundId) {
                changeObj = change;
                filePath = pathToFile;
                break;
            }
        }

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
 * @param {DescriptorVariant} variant - The app descriptor variant.
 * @param {number} timestamp - The timestamp.
 * @param {object} content - The content of the change to be applied.
 * @param {ChangeType} changeType - The type of the change.
 * @returns - An object representing the change
 */
export function getChange(
    { reference, layer, namespace }: ChangeMetadata,
    timestamp: number,
    content: object,
    changeType: ChangeType
): ManifestChangeProperties {
    return {
        fileName: `id_${timestamp}`,
        namespace: path.posix.join(namespace, DirName.Changes),
        layer,
        fileType: 'change',
        creation: new Date(timestamp).toISOString(),
        packageName: '$TMP',
        reference,
        support: { generator: '@sap-ux/adp-tooling' },
        changeType,
        content
    };
}
