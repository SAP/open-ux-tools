import path from 'node:path';
import { create as createStorage } from 'mem-fs';
import { type Editor, create } from 'mem-fs-editor';

import { type NewI18nEntry, SapShortTextType, removeAndCreateI18nEntries } from '@sap-ux/i18n';

import { getVariant, updateVariant } from '../';
import type { Content, InternalInboundNavigation, DescriptorVariantContent } from '../types';
import { enhanceManifestChangeContentWithFlpConfig as enhanceInboundConfig } from './options';

/**
 * Generates and writes the inbound configuration to the manifest.appdescr_variant file.
 *
 * @param basePath - The base path of the project.
 * @param configs - The inbound configuration properties.
 * @param fs - Optional mem-fs editor instance.
 * @returns The mem-fs editor instance.
 */
export async function generateInboundConfig(
    basePath: string,
    configs: InternalInboundNavigation[],
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const variant = await getVariant(basePath, fs);

    variant.content = removeInboundChangeTypes(variant.content);

    // Set default inbound IDs if missing
    configs.forEach((config) => {
        if (!config?.inboundId) {
            config.inboundId = `${variant.id}.InboundID`;
        }
    });

    enhanceInboundConfig(configs, variant.id, variant.content as Content[]);

    await updateVariant(basePath, variant, fs);
    await updateI18n(basePath, variant.id, configs, fs);

    return fs;
}

/**
 * Generates i18n entries for FLP configuration based on the provided configuration and application ID.
 *
 * @param {InternalInboundNavigation} config - The inbound configuration properties.
 * @param {string} appId - The application ID for creating unique i18n keys.
 * @returns {NewI18nEntry[]} An array of new i18n entries to be added or updated.
 */
export function getFlpI18nKeys(config: InternalInboundNavigation, appId: string): NewI18nEntry[] {
    const newEntries: NewI18nEntry[] = [];
    const baseKey = `${appId}_sap.app.crossNavigation.inbounds.${config.inboundId}`;

    newEntries.push({
        key: `${baseKey}.title`,
        value: config.title,
        annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Title' }
    });
    if (config?.subTitle) {
        newEntries.push({
            key: `${baseKey}.subTitle`,
            value: config.subTitle,
            annotation: { textType: SapShortTextType.TableTitle, note: 'Fiori Launchpad Tile Subtitle' }
        });
    }

    return newEntries;
}

/**
 * Updates the i18n.properties file with new FLP configuration entries.
 *
 * @param {string} basePath - The base path of the project.
 * @param {string} appId - The application ID used to generate i18n keys.
 * @param {InternalInboundNavigation[]} configs - The inbound configuration properties.
 * @param {Editor} fs - The mem-fs editor instance for file operations.
 * @returns {Promise<void>} A promise that resolves when the i18n file is updated.
 */
export async function updateI18n(
    basePath: string,
    appId: string,
    configs: InternalInboundNavigation[],
    fs: Editor
): Promise<void> {
    let newEntries: NewI18nEntry[] = [];
    configs.forEach((config) => {
        newEntries = newEntries.concat(getFlpI18nKeys(config, appId));
    });
    const i18nPath = path.join(basePath, 'webapp', 'i18n', 'i18n.properties');
    const keysToRemove = [`${appId}_sap.app.crossNavigation.inbounds`];
    await removeAndCreateI18nEntries(i18nPath, newEntries, keysToRemove, basePath, fs);
}

/**
 * Removes elements with changeType 'appdescr_app_addNewInbound', 'appdescr_app_removeAllInboundsExceptOne' and 'appdescr_app_changeInbound' from the given array.
 *
 * @param content The array of manifest change objects.
 * @returns A new array with the specified elements removed.
 */
export function removeInboundChangeTypes(content: DescriptorVariantContent[]): DescriptorVariantContent[] {
    return content.filter(
        (item) =>
            item.changeType !== 'appdescr_app_addNewInbound' &&
            item.changeType !== 'appdescr_app_changeInbound' &&
            item.changeType !== 'appdescr_app_removeAllInboundsExceptOne'
    );
}
