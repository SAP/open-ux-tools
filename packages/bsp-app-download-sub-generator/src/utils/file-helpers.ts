import { adtSourceTemplateId } from './constants';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { FileName, type Manifest } from '@sap-ux/project-access';
import { t } from './i18n';

/**
 * Reads and validates the `manifest.json` file.
 *
 * @param {string} extractedProjectPath - The path to the extracted project.
 * @param {Editor} fs - The file system editor.
 * @returns {Promise<Manifest>} The validated manifest object.
 * @throws {Error} If the manifest file is missing or invalid.
 */
export async function readManifest(extractedProjectPath: string, fs: Editor): Promise<Manifest> {
    const manifestPath = join(extractedProjectPath, FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;
    if (!manifest) {
        throw Error(t('error.manifestNotFound'));
    }
    if (!manifest['sap.app']) {
        throw Error(t('error.sapAppNotDefined'));
    }
    if (manifest['sap.app'].sourceTemplate?.id !== adtSourceTemplateId) {
        throw Error(t('error.sourceTemplateNotSupported'));
    }
    return manifest;
}
