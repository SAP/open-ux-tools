import { stat } from 'fs';
import { CdsEnvironment } from '../types';
import { getI18nConfiguration } from './config';

export function jsonPath(path: string): string {
    return `${path}.json`;
}
export function capPropertiesPath(path: string, env: CdsEnvironment): string {
    const { fallbackLanguage } = getI18nConfiguration(env);
    const languageSuffix = fallbackLanguage === '' ? '' : `_${fallbackLanguage}`;
    return `${path}${languageSuffix}.properties`;
}
export function csvPath(path: string): string {
    return `${path}.csv`;
}

/**
 * Check if a folder of a file exists.
 *
 * @param path an absolute path to a folder or a file
 */
export const doesExist = (path: string): Promise<boolean> => {
    return new Promise((resolve) => {
        stat(path, (err) => {
            if (err) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
};
