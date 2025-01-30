import type { Manifest, ManifestNamespace } from '@sap-ux/project-access';
import { FileName, getWebappPath } from '@sap-ux/project-access';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { mergeObjects } from '@sap-ux/ui5-config';
import { join } from 'path';
import { NAV_CONFIG_NS, t } from '../i18n';

/**
 * Adds a basic inbound navigation configuration to the application manifest.
 *
 * @param appRootPath app path
 * @param inboundConfig the inbound configuration to be written
 * @param inboundConfig.semanticObject semantic object
 * @param inboundConfig.action action
 * @param inboundConfig.title Represents a title; to make this property language dependent (recommended), use a key in double curly brackets '{{key}}' and add to i18n file
 * @param inboundConfig.subTitle optional, Represents a subtitle; to make this property language dependent (recommended), use a key in double curly brackets '{{key}}' and add to i18n file
 * @param overwrite overwrite existing config
 * @param fs file system reference
 * @returns file system reference
 */
export async function generateInboundNavigationConfig(
    appRootPath: string,
    { semanticObject, action, title, subTitle }: ManifestNamespace.Inbound[string],
    overwrite = false,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const { manifest, manifestPath } = await readManifest(appRootPath, fs);
    const inboundKey = `${semanticObject}-${action}`;

    if (!overwrite && manifest['sap.app'].crossNavigation?.inbounds[inboundKey]) {
        throw Error(t('error.inboundExists', { inboundKey, ns: NAV_CONFIG_NS }));
    }

    const inbound = {
        [inboundKey]: {
            semanticObject,
            action,
            title,
            subTitle,
            signature: {
                parameters: {},
                additionalParameters: 'allowed'
            }
        }
    };
    const crossNavigation: Manifest['sap.app']['crossNavigation'] = Object.assign(
        manifest['sap.app'].crossNavigation ?? {},
        {
            inbounds: mergeObjects(manifest['sap.app'].crossNavigation?.inbounds, inbound)
        }
    );

    fs.extendJSON(manifestPath, { 'sap.app': Object.assign(manifest['sap.app'], { crossNavigation }) });
    return fs;
}

/**
 * Validates the basic manifest structure and existence required for inbound navigation addition.
 *
 * @param appPath path to the application
 * @param fs Editor instance
 * @throws an error specifiying the validation failure
 * @returns the manifest object and manifest path
 */
export async function readManifest(appPath: string, fs: Editor): Promise<{ manifest: Manifest; manifestPath: string }> {
    const manifestPath = join(await getWebappPath(appPath, fs), FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;

    if (!manifest) {
        throw Error(t('error.manifestNotFound', { path: manifestPath, ns: NAV_CONFIG_NS }));
    }

    if (!manifest['sap.app']) {
        throw Error(t('error.sapAppNotDefined', { ns: NAV_CONFIG_NS }));
    }

    return {
        manifest,
        manifestPath
    };
}
