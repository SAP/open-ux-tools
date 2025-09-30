import { FileName, getWebappPath } from '@sap-ux/project-access';
import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { existsSync, readFileSync } from 'node:fs';
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
 * @returns The variant namespace.
 */
export async function getVariantNamespace(path: string, isS4HC: boolean): Promise<string | undefined> {
    if (isS4HC) {
        return undefined;
    }

    try {
        const webappPath = await getWebappPath(path);
        const filePath = join(webappPath, FileName.ManifestAppDescrVar);
        if (existsSync(filePath)) {
            const descriptor = JSON.parse(readFileSync(filePath, 'utf-8'));
            return descriptor.namespace;
        }
    } catch (e) {
        DeploymentGenerator.logger?.debug(t('debug.lrepNamespaceNotFound', { error: e.message }));
    }
    return undefined;
}
