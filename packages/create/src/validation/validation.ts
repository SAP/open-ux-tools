import { existsSync } from 'fs';
import type { Editor } from 'mem-fs-editor';
import { join } from 'path';
import type { EditorWithDump } from '../types';

/**
 * Validate base path of app, throw error if file is missing.
 *
 * @param basePath - base path of the app, where package.json and ui5.yaml resides
 */
export function validateBasePath(basePath: string): void {
    const packageJsonPath = join(basePath, 'package.json');
    if (!existsSync(packageJsonPath)) {
        throw Error(`Required file '${packageJsonPath}' does not exist.`);
    }
    const ui5YamlPath = join(basePath, 'ui5.yaml');
    const webappPath = join(basePath, 'webapp');
    if (!existsSync(ui5YamlPath) && !existsSync(webappPath)) {
        throw Error(`There must be either a folder '${webappPath}' or a config file '${ui5YamlPath}'`);
    }
}

/**
 * Return if an instance of mem-fs editor recorded any deletion.
 *
 * @param fs - the memfs editor instance
 * @returns - true if fs contains deletions; false otherwise
 */
export function hasFileDeletes(fs: Editor): boolean {
    const editorWithDump = fs as EditorWithDump;
    const changedFiles = editorWithDump.dump() || {};
    return !!Object.keys(changedFiles).find((fileName) => changedFiles[fileName].state === 'deleted');
}
