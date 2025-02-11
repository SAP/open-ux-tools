import path from 'path';
import { create as createStorage } from 'mem-fs';
import { type Editor, create } from 'mem-fs-editor';

import { type NewI18nEntry, createPropertiesI18nEntries } from '@sap-ux/i18n';

import { getVariant, updateVariant } from '../';
import type { Content, InternalInboundNavigation } from '../types';
import { enhanceManifestChangeContentWithFlpConfig as enhanceInboundConfig } from './options';

/**
 * Generates and writes the inbound configuration to the manifest.appdescr_variant file.
 *
 * @param basePath - The base path of the project.
 * @param config - The inbound configuration properties.
 * @param fs - Optional mem-fs editor instance.
 * @returns The mem-fs editor instance.
 */
export async function generateInboundConfig(
    basePath: string,
    config: InternalInboundNavigation,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }

    const variant = getVariant(basePath, fs);

    if (!config?.inboundId) {
        config.addInboundId = true;
        config.inboundId = `${variant.id}.InboundID`;
    }

    enhanceInboundConfig(config, variant.id, variant.content as Content[]);

    updateVariant(basePath, variant, fs);
    await updateI18n(basePath, variant.id, config, fs);

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

    newEntries.push({ key: `${baseKey}.title`, value: config.title });
    if (config?.subTitle) {
        newEntries.push({ key: `${baseKey}.subTitle`, value: config.subTitle });
    }

    return newEntries;
}

/**
 * Updates the i18n.properties file with new FLP configuration entries.
 *
 * @param {string} basePath - The base path of the project.
 * @param {string} appId - The application ID used to generate i18n keys.
 * @param {InternalInboundNavigation} config - The inbound configuration properties.
 * @param {Editor} fs - The mem-fs editor instance for file operations.
 * @returns {Promise<void>} A promise that resolves when the i18n file is updated.
 */
export async function updateI18n(
    basePath: string,
    appId: string,
    config: InternalInboundNavigation,
    fs: Editor
): Promise<void> {
    const newEntries = getFlpI18nKeys(config, appId);
    const i18nPath = path.join(basePath, 'webapp', 'i18n', 'i18n.properties');

    await createPropertiesI18nEntries(i18nPath, newEntries, basePath, fs);
}
