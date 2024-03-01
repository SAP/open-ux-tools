import type { CdsEnvironment, I18nBundle } from '../../types';
import { getCapI18nFiles, getI18nConfiguration, jsonPath, capPropertiesPath, csvPath } from '../../utils';
import { jsonToI18nBundle } from '../../transformer/json';
import { propertiesToI18nEntry } from '../../transformer/properties';
import { csvToI18nBundle } from '../../transformer/csv';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStore } from 'mem-fs';

/**
 * Try to convert text to i18n bundle.
 *
 * @param path file path
 * @param toI18nBundle function to convert to i18n bundle
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns i18n bundle or undefine
 */
function tryTransformTexts(
    path: string,
    toI18nBundle: (content: string, path?: string) => I18nBundle,
    fs: Editor
): I18nBundle | undefined {
    if (!fs.exists(path)) {
        return undefined;
    }
    const content = fs.read(path);
    return toI18nBundle(content, path);
}

/**
 * Get transformers.
 *
 * @param fallbackLanguage fallback language
 * @returns array of transformer
 */
const getTransformers = (fallbackLanguage: string) => [
    { toI18nBundle: jsonToI18nBundle, bundlePath: jsonPath },
    {
        toI18nBundle: (content: string, path?: string): I18nBundle => ({
            [fallbackLanguage]: propertiesToI18nEntry(content, path)
        }),
        bundlePath: capPropertiesPath
    },
    { toI18nBundle: csvToI18nBundle, bundlePath: csvPath }
];

/**
 * Merges i18n files in to a single bundle for CDS source files.
 *
 * @param root project root
 * @param env CDS environment configuration
 * @param filePaths CDS file path
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns i18n bundle or exception
 */
export function getCapI18nBundle(root: string, env: CdsEnvironment, filePaths: string[], fs?: Editor): I18nBundle {
    fs ??= create(createStore());
    const bundle: I18nBundle = {};
    const { defaultLanguage, fallbackLanguage } = getI18nConfiguration(env);
    const i18nFileLocations = getCapI18nFiles(root, env, filePaths);
    for (const path of i18nFileLocations) {
        const transformers = getTransformers(fallbackLanguage);
        for (const { toI18nBundle, bundlePath } of transformers) {
            const i18nFilePath = bundlePath(path, env);
            const entries = tryTransformTexts(i18nFilePath, toI18nBundle, fs);
            if (!entries) {
                continue;
            }
            const currentBundle = entries[fallbackLanguage] ?? entries[defaultLanguage] ?? [];
            for (const entry of currentBundle) {
                if (!bundle[entry.key.value]) {
                    bundle[entry.key.value] = [];
                }
                bundle[entry.key.value].push(entry);
            }
            break;
        }
    }

    return bundle;
}
