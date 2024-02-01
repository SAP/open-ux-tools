import type { CdsEnvironment, I18nBundle } from '../../types';
import { getCapI18nFiles, getI18nConfiguration, jsonPath, capPropertiesPath, csvPath, doesExist } from '../../utils';
import { promises } from 'fs';
import { jsonToI18nBundle } from '../../transformer/json';
import { propertiesToI18nEntry } from '../../transformer/properties';
import { csvToI18nBundle } from '../../transformer/csv';

async function tryTransformTexts(
    path: string,
    toI18nBundle: (content: string, path?: string) => I18nBundle
): Promise<I18nBundle | undefined> {
    if (!(await doesExist(path))) {
        return;
    }
    const content = await promises.readFile(path, { encoding: 'utf8' });
    return toI18nBundle(content, path);
}

const getTransformers = (fallbackLanguage: string) => [
    { toI18nBundle: jsonToI18nBundle, filePath: jsonPath },
    {
        toI18nBundle: (content: string, path?: string): I18nBundle => ({
            [fallbackLanguage]: propertiesToI18nEntry(content, path)
        }),
        filePath: capPropertiesPath
    },
    { toI18nBundle: csvToI18nBundle, filePath: csvPath }
];

/**
 * Merges i18n files in to a single bundle for CDS source files
 * @param env CDS environment configuration
 * @param filePaths CDS file path
 * @returns i18n bundle or exception
 */
export async function getCapI18nBundle(root: string, env: CdsEnvironment, filePaths: string[]): Promise<I18nBundle> {
    const bundle: I18nBundle = {};
    const { defaultLanguage, fallbackLanguage } = getI18nConfiguration(env);
    const i18nFileLocations = getCapI18nFiles(root, env, filePaths);
    for (const path of i18nFileLocations) {
        const transformers = getTransformers(fallbackLanguage);
        for (const { toI18nBundle, filePath } of transformers) {
            const i18nFilePath = filePath(path, env);
            const entries = await tryTransformTexts(i18nFilePath, toI18nBundle);
            if (entries) {
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
    }

    return bundle;
}
