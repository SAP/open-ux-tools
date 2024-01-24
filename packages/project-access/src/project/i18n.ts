import { join } from 'path';
import type { Manifest } from '../types';

/**
 * Return paths to i18n.properties files from manifest.
 *
 * @param relativeWebappPath - relative path to folder that contains manifest.json
 * @param manifest - parsed content of manifest.json
 * @returns - paths to i18n.properties files, split by manifest section
 */
export function getI18nPaths(
    relativeWebappPath: string,
    manifest: Manifest
): { ['sap.app']: string; ['sap.ui5']?: string } {
    const i18nPaths: ReturnType<typeof getI18nPaths> = {
        'sap.app': join(
            relativeWebappPath,
            typeof manifest?.['sap.app']?.i18n === 'string' ? manifest['sap.app']['i18n'] : 'i18n/i18n.properties'
        )
    };
    let relativePath;
    const i18nModel = manifest?.['sap.ui5']?.models?.['i18n'] ?? {};
    if (typeof i18nModel.uri === 'string') {
        relativePath = i18nModel.uri;
    } else if (typeof i18nModel.settings?.bundleUrl === 'string') {
        relativePath = i18nModel.settings.bundleUrl;
    } else if (typeof i18nModel.settings?.bundleName === 'string') {
        const relBundleString = i18nModel.settings.bundleName.replace(manifest['sap.app'].id, '');
        relativePath = `${join(...relBundleString.split('.'))}.properties`;
    }
    const sapUi5Path = relativePath ? join(relativeWebappPath, relativePath) : undefined;
    if (sapUi5Path) {
        i18nPaths['sap.ui5'] = sapUi5Path;
    }
    return i18nPaths;
}
