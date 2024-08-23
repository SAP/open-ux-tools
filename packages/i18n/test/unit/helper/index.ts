import { relative } from 'path';
import type { I18nBundle } from '../../../src/types';
export { getInput, getAst, getAllNormalizeFolderPath, getBase, getFileContent, getToken } from './setup';

export { deserialize } from './deserialize-ast';
export { serialize } from './serialize';

const pathSeparator = (uri: string) => uri.charAt(uri.search(/\\|\//));
export const toUnifiedUri = (root: string, uris: (string | undefined)[]): string[] => {
    const result: string[] = [];
    for (const uri of uris) {
        if (!uri) {
            continue;
        }
        const relativePath = relative(root, uri);
        const separator = pathSeparator(relativePath);
        if (!separator) {
            result.push(relativePath);
            continue;
        }
        result.push(relativePath.split(separator).join('/'));
    }
    return result;
};

export const replaceBundleWithUnifiedFileUri = (root: string, i18nBundle: I18nBundle | Error): void => {
    if (i18nBundle instanceof Error) {
        return;
    }
    const keys = Object.keys(i18nBundle);
    for (let i = 0; keys.length > i; i++) {
        i18nBundle[keys[i]].map((entry) => (entry.filePath = toUnifiedUri(root, [entry.filePath])[0]));
    }
};
