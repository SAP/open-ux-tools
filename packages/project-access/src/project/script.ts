import { join } from 'path';
import { FileName } from '../constants';
import type { Package } from '../types';
import type { Editor } from 'mem-fs-editor';
import { readJSON, updatePackageJSON } from '../file';

/**
 * Updates the package.json with a new script.
 *
 * @param basePath - the base path
 * @param scriptName - the script name
 * @param script - the script content
 * @param fs - optional memfs editor instance
 */
export async function updatePackageScript(
    basePath: string,
    scriptName: string,
    script: string,
    fs?: Editor
): Promise<void> {
    const filePath = join(basePath, FileName.Package);
    const packageJson = await readJSON<Package>(filePath, fs);
    if (!packageJson.scripts) {
        packageJson.scripts = {};
    }
    packageJson.scripts[scriptName] = script;
    await updatePackageJSON(filePath, packageJson, fs);
}
