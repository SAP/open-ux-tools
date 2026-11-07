import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

import type { OutboundNavigation } from './types.js';
import { getManifest } from '../common/utils.js';
import { extendJSON, getJsonSpace } from '../common/file.js';
import { render } from 'ejs';
import { getTemplatePath } from '../templates.js';

type TargetOptionsAddition = { options?: { settings?: { navigation?: { [key: string]: unknown } } } };
/**
 * Add an Outbound Navigation Link to a page of a UI5 application.
 *
 * @param basePath - the base path
 * @param data - the object page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function generate(basePath: string, data: OutboundNavigation, fs?: Editor): Promise<Editor> {
    if (!data.navigation?.sourcePage) {
        throw new Error(`Invalid data. Navigation source page name is missing!`);
    }
    fs ??= create(createStorage());
    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);
    const page = manifest['sap.ui5']?.routing?.targets?.[data.navigation.sourcePage];
    if (!page) {
        throw new Error(`Could not find navigation source ${data.navigation.sourcePage}!`);
    }
    if (data.settings.crossNavigation && manifest['sap.app'].crossNavigation?.outbounds?.[data.settings.outboundKey]) {
        throw new Error(`The outbound with the key ${data.settings.outboundKey} already exists!`);
    }

    const navigation = (page as unknown as TargetOptionsAddition).options?.settings?.navigation;
    // if navigation already exists, delete it
    if (navigation?.[data.entity]) {
        delete navigation[data.entity];
        fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, data.tabInfo));
    }

    extendJSON(fs, {
        filepath: manifestPath,
        content: render(fs.read(getTemplatePath('outboundNavigation/manifest.json')), data, {}),
        replacer: undefined,
        tabInfo: data.tabInfo
    });

    return fs;
    // extendPageJSON(basePath, data, enhanceData.bind(undefined, fs), 'outboundNavigation/manifest.json', fs);
}

/**
 * Delete an Outbound Navigation Link.
 *
 * @param basePath - the base path
 * @param data - the object page configuration
 * @param fs - the memfs editor instance
 * @returns the updated memfs editor instance
 */
export async function deleteOutboundNavigation(
    basePath: string,
    data: OutboundNavigation,
    fs?: Editor
): Promise<Editor> {
    fs ??= create(createStorage());
    const { path: manifestPath, content: manifest } = await getManifest(basePath, fs);
    if (data.navigation?.sourcePage) {
        const page = manifest['sap.ui5']?.routing?.targets?.[data.navigation.sourcePage];
        if (!page) {
            throw new Error(`Could not find navigation source ${data.navigation.sourcePage}!`);
        }
        const navigation = (page as unknown as TargetOptionsAddition).options?.settings?.navigation;
        if (navigation?.[data.entity]) {
            delete navigation[data.entity];
            fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, data.tabInfo));
        }
    }
    if (data.settings.outboundKey && manifest['sap.app'].crossNavigation?.outbounds?.[data.settings.outboundKey]) {
        delete manifest['sap.app'].crossNavigation.outbounds[data.settings.outboundKey];
        fs.writeJSON(manifestPath, manifest, undefined, getJsonSpace(fs, manifestPath, data.tabInfo));
    }

    return fs;
}
