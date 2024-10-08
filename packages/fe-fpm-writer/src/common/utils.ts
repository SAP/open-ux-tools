import type { Editor } from 'mem-fs-editor';
import os from 'os';
import { join } from 'path';
import { coerce, minor } from 'semver';
import { getWebappPath } from '@sap-ux/project-access';
import { getTemplatePath } from '../templates';
import type { FileContentPosition, Manifest, ManifestData } from './types';

/**
 * Method inserts passed text into content by char index position.
 * In case if position is out of range, then whitespaces would be created.
 * Negative positions are not supported.
 *
 * @param {string} text - text to insert
 * @param {string} content - target content for update
 * @param {number} position - Char index position to insert in
 * @returns new content with inserted text
 */
export function insertTextAtAbsolutePosition(text: string, content: string, position: number): string {
    if (position < 0) {
        return content;
    }
    // Check if char position exist and create missing chars
    const prepareCharIndex = Math.max(position - 1, 0);
    while (prepareCharIndex > 0 && content[prepareCharIndex] === undefined) {
        content += ' ';
    }
    return `${content.slice(0, position)}${text}${content.slice(position)}`;
}

/**
 * Method inserts passed text into content by line and char position.
 * In case if position is out of range, then whitespaces would be created.
 * Negative positions are not supported.
 *
 * @param {string} text - text to insert
 * @param {string} content - target content for update
 * @param {FileContentPosition} position - Line and char position to insert in
 * @returns new content with inserted text
 */
export function insertTextAtPosition(text: string, content: string, position: FileContentPosition): string {
    if (position.line < 0 || position.character < 0) {
        return content;
    }
    const lines = content.split(/\r\n|\n/);
    let targetLine = lines[position.line];
    // Check if line position exist and create missing lines
    while (targetLine === undefined) {
        lines.push('');
        targetLine = lines[position.line];
    }
    // Update line with inserting passed text
    lines[position.line] = insertTextAtAbsolutePosition(text, lines[position.line], position.character);
    return lines.join(os.EOL);
}

/**
 * Adds type extensions for sap.fe types if an older version is used.
 * The types were fixed in 1.108 and downported to 1.102.
 *
 * @param basePath - the base path
 * @param minUI5Version - minimal required UI5 version
 * @param fs - the memfs editor instance
 */
export function addExtensionTypes(basePath: string, minUI5Version: string | undefined, fs: Editor) {
    const version = minor(coerce(minUI5Version) ?? '1.108.0');
    const path = join(basePath, '/webapp/ext/sap.fe.d.ts');
    if (version < 108 && version !== 102 && !fs.exists(path)) {
        fs.copyTpl(getTemplatePath('common/sap.fe.d.ts'), path, { version });
    }
}

/**
 * Gets manifest path.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @returns {Manifest | undefined} path to manifest file
 */
export async function getManifestPath(basePath: string, fs: Editor): Promise<string> {
    return join(await getWebappPath(basePath, fs), 'manifest.json');
}

/**
 * Gets content and path of the manifest.
 *
 * @param {string} basePath the base path
 * @param {Editor} fs the memfs editor instance
 * @param {boolean} [validate] validate if 'manifest.json' file exists - throw error if file does not exist
 * @returns {Manifest | undefined} The content and path of the manifest
 */
export async function getManifest(basePath: string, fs: Editor, validate = true): Promise<ManifestData> {
    const path = await getManifestPath(basePath, fs);
    if (validate && !fs.exists(path)) {
        throw new Error(`Invalid project folder. Cannot find required file ${path}`);
    }
    return {
        path,
        content: fs.readJSON(path) as Manifest
    };
}
