import { FileName, getWebappPath } from '@sap-ux/project-access';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { t } from './i18n';
import { DeploymentGenerator } from '@sap-ux/deploy-config-generator-shared';

/**
 * Checks if index.html exists in Fiori project's custom webapp folder path.
 *
 * @param fs - the memfs editor instance
 * @param path - the project path
 * @returns true if index.html exists
 */
export async function indexHtmlExists(fs: Editor, path: string): Promise<boolean> {
    const customWebappPath = await getWebappPath(path);
    const indexHtmlPath = join(customWebappPath, 'index.html');
    return fs.exists(indexHtmlPath);
}

/**
 * Get the variant namespace from the manifest.appdescr_variant file.
 * Will return undefined if the project is CloudReady or if the project is not an ADP project.
 *
 * @param path - The path to the project.
 * @param isS4HC - Whether the project is Cloud.
 * @param fs - The file system editor.
 * @returns The variant namespace.
 */
export async function getVariantNamespace(path: string, isS4HC: boolean, fs: Editor): Promise<string | undefined> {
    if (isS4HC) {
        return undefined;
    }

    try {
        const filePath = join(await getWebappPath(path, fs), FileName.ManifestAppDescrVar);

        if (fs.exists(filePath)) {
            const descriptor = fs.readJSON(filePath) as unknown as { namespace: string };
            return descriptor.namespace;
        }
    } catch (e) {
        DeploymentGenerator.logger?.debug(t('debug.lrepNamespaceNotFound', { error: e.message }));
    }
    return undefined;
}
