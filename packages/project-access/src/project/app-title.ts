import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { extractDoubleCurlyBracketsKey, getPropertiesI18nBundle } from '@sap-ux/i18n';
import type { Logger } from '@sap-ux/logger';
import { FileName } from '../constants.js';
import { readJSON } from '../file/index.js';
import type { Manifest } from '../types/index.js';
import { getI18nPropertiesPaths } from './i18n/i18n.js';

/**
 * Resolves the application title from the manifest, following i18n key references when present.
 *
 * @param params - webapp path and optional pre-parsed manifest
 * @param params.webappPath - path to the webapp directory; used to locate manifest.json and resolve i18n paths
 * @param params.manifest - pre-parsed manifest content; pass to avoid re-reading from disk
 * @param [options] - optional options
 * @param [options.memFs] - optional mem-fs-editor instance
 * @param [options.logger] - optional logger instance
 * @returns the resolved title string, or undefined if it cannot be determined
 */
export async function resolveApplicationTitle(
    params: { webappPath: string; manifest?: Manifest },
    options?: { memFs?: Editor; logger?: Logger }
): Promise<string | undefined> {
    const { webappPath } = params;
    let { manifest } = params;
    const { memFs, logger } = options ?? {};
    const manifestPath = join(webappPath, FileName.Manifest);

    manifest ??= await readJSON<Manifest>(manifestPath, memFs);

    const rawTitle = manifest?.['sap.app']?.title;
    if (!rawTitle) {
        return undefined;
    }

    const i18nKey = extractDoubleCurlyBracketsKey(rawTitle);
    if (!i18nKey) {
        return rawTitle;
    }

    try {
        const i18nPaths = await getI18nPropertiesPaths(manifestPath, manifest, memFs);
        const bundle = await getPropertiesI18nBundle(i18nPaths['sap.app'], memFs);
        return bundle[i18nKey]?.[0]?.value?.value;
    } catch (error) {
        logger?.debug(`Failed to load i18n properties bundle: ${error}`);
        return undefined;
    }
}
