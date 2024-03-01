import type { CdsEnvironment } from '../types';
import { getI18nConfiguration } from './config';

/**
 * Get json path.
 *
 * @param path file path
 * @returns .json file path
 */
export function jsonPath(path: string): string {
    return `${path}.json`;
}
/**
 * Get properties path.
 *
 * @param path file path
 * @param env cds environment
 * @returns .properties file path
 */
export function capPropertiesPath(path: string, env: CdsEnvironment): string {
    const { fallbackLanguage } = getI18nConfiguration(env);
    const languageSuffix = fallbackLanguage === '' ? '' : `_${fallbackLanguage}`;
    return `${path}${languageSuffix}.properties`;
}

/**
 * Get csv path.
 *
 * @param path file path
 * @returns .csv file path
 */
export function csvPath(path: string): string {
    return `${path}.csv`;
}
