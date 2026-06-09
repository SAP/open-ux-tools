import type { Manifest } from '@sap-ux/project-access';
import { FileName, getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { join } from 'node:path';
import { t } from './i18n.js';

/**
 * Validates the basic manifest structure and existence required for inbound navigation addition.
 *
 * @param appPath path to the application
 * @param fs Editor instance
 * @param ns namespace for error messages
 * @throws an error specifying the validation failure
 * @returns the manifest object and manifest path
 */
export async function readManifest(
    appPath: string,
    fs: Editor,
    ns: string
): Promise<{ manifest: Manifest; manifestPath: string }> {
    const manifestPath = join(await getWebappPath(appPath, fs), FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;

    if (!manifest) {
        throw Error(t('error.manifestNotFound', { path: manifestPath, ns }));
    }

    if (!manifest['sap.app']) {
        throw Error(t('error.sapAppNotDefined', { ns }));
    }

    return {
        manifest,
        manifestPath
    };
}
