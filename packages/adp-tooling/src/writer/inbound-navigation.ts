import path from 'path';
import { type Editor, create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';

import { NewI18nEntry, createPropertiesI18nEntries } from '@sap-ux/i18n';

import { getVariant } from '../';
import type { Content, DescriptorVariant, InternalInboundNavigation } from '../types';
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

    const variant = getVariant(basePath);

    if (!config?.inboundId) {
        config.addInboundId = true;
        config.inboundId = `${variant.id}.InboundID`;
    }

    enhanceInboundConfig(config, variant.id, variant.content as Content[]);

    updateVariant(basePath, variant, fs);
    await updateI18n(basePath, variant, config, fs);

    return fs;
}

export function getFlpI18nKeys(config: InternalInboundNavigation, variant: DescriptorVariant): NewI18nEntry[] {
    const newEntries: NewI18nEntry[] = [];
    const baseKey = `${variant.id}_sap.app.crossNavigation.inbounds.${config.inboundId}`;

    newEntries.push({ key: `${baseKey}.title`, value: config.title });
    if (config?.subTitle) {
        newEntries.push({ key: `${baseKey}.subTitle`, value: config.title });
    }

    return newEntries;
}

export function updateVariant(basePath: string, variant: DescriptorVariant, fs: Editor) {
    fs.writeJSON(path.join(basePath, 'manifest.appdescr_variant'), variant);
}

export async function updateI18n(
    basePath: string,
    variant: DescriptorVariant,
    config: InternalInboundNavigation,
    fs: Editor
): Promise<void> {
    const newEntries = getFlpI18nKeys(config, variant);
    const i18nPath = path.join(basePath, 'webapp', 'i18n.properties');

    await createPropertiesI18nEntries(i18nPath, newEntries, basePath, fs);
}
