import { type Manifest, FileName, DirName } from '@sap-ux/project-access';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';

/**
 * Reads the manifest.json file and returns its content.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} manifestPath - The path to the manifest.json file.
 * @returns {Manifest | undefined} The content of the manifest.json file, or undefined if the file doesn't exist.
 */
function getManifest(fs: Editor, manifestPath: string): Manifest | undefined {
    if (fs.exists(manifestPath)) {
        return fs.readJSON(manifestPath) as any as Manifest;
    }
    return undefined;
}

/**
 * Generates the path to the manifest.json file located within the 'webapp' directory.
 *
 * @param {string} appRoot - The root directory of the application.
 * @returns {string} The path to the manifest.json file.
 */
function getManifestPathFromWebapp(appRoot: string): string {
    return join(appRoot, DirName.Webapp, FileName.Manifest);
}

/**
 * Removes OData annotations from the content of the manifest.json file.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} manifestPath - The path to the manifest.json file.
 * @param {Manifest} manifest - The content of the manifest.json file.
 * @returns {void}
 */
function removeODataAnnotationsFromManifest(fs: Editor, manifestPath: string, manifest: Manifest): void {
    if (manifest['sap.app']?.dataSources) {
        fs.extendJSON(manifestPath, {}, (key, value) => {
            if (key === 'annotation' && Object.values(value).includes('ODataAnnotation')) {
                return undefined;
            }
            if (key === 'annotations' && Array.isArray(value) && value.length === 1) {
                return [];
            }
            return value;
        });
    }
}

/**
 * Updates the CAP manifest JSON file to remove annotation.xml references.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} appRoot - The root directory of the application.
 */
export function updateCAPManifestJson(fs: Editor, appRoot: string): void {
    const manifestPath = getManifestPathFromWebapp(appRoot);
    const manifest = getManifest(fs, manifestPath);
    if (manifest) {
        removeODataAnnotationsFromManifest(fs, manifestPath, manifest);
    }
}
