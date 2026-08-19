import type { Editor } from 'mem-fs-editor';
import { extractDoubleCurlyBracketsKey, getPropertiesI18nBundle } from '@sap-ux/i18n';
import { readJSON } from '../file/index.js';
import type { Manifest } from '../types/index.js';
import { getI18nPropertiesPaths } from './i18n/i18n.js';

/**
 * Resolves the application title from the manifest, following i18n key references when present.
 *
 * @param params - either a manifestPath to read from disk, a pre-parsed manifest, or both
 * @param params.manifestPath - path to manifest.json; required to read manifest from disk and to resolve i18n paths
 * @param params.manifest - pre-parsed manifest content; pass to avoid re-reading from disk
 * @param memFs - optional mem-fs-editor instance
 * @returns the resolved title string, or undefined if it cannot be determined
 */
export async function resolveApplicationTitle(
    params: { manifestPath?: string; manifest?: Manifest },
    memFs?: Editor
): Promise<string | undefined> {
    const { manifestPath } = params;
    let { manifest } = params;

    if (!manifest) {
        if (!manifestPath) {
            return undefined;
        }
        manifest = await readJSON<Manifest>(manifestPath, memFs);
    }

    const rawTitle = manifest?.['sap.app']?.title;
    if (!rawTitle) {
        return undefined;
    }

    const i18nKey = extractDoubleCurlyBracketsKey(rawTitle);
    if (!i18nKey) {
        return rawTitle;
    }

    if (!manifestPath) {
        return undefined;
    }

    const i18nPaths = await getI18nPropertiesPaths(manifestPath, manifest, memFs);
    const bundle = await getPropertiesI18nBundle(i18nPaths['sap.app'], memFs);
    return bundle[i18nKey]?.[0]?.value.value;
}
