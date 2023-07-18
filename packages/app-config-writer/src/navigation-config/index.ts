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
 * @param inboundConfig.title Represents a title; to make this property language dependent (recommended), use a key in double curly brackets '{{key}}'
 * @param inboundConfig.subTitle optional, Represents a subtitle; to make this property language dependent (recommended), use a key in double curly brackets '{{key}}'
 * @param overwrite overwrite existing config
 * @param fs file system reference
 * @returns file system reference
 */
export async function generateInboundNavigationConfig(
    appRootPath: string,
    { semanticObject, action, title, subTitle }: Partial<ManifestNamespace.Inbound[string]>,
    overwrite = false,
    fs?: Editor
): Promise<Editor> {
    if (!fs) {
        fs = create(createStorage());
    }
    const manifestPath = join(await getWebappPath(appRootPath), FileName.Manifest);
    const manifest = fs.readJSON(manifestPath) as unknown as Manifest;

    if (!manifest) {
        throw Error(t('error.manifestNotFound', { path: manifestPath, ns: NAV_CONFIG_NS }));
    }

    if (!manifest['sap.app']) {
        throw Error(t('error.sapAppNotDefined', { ns: NAV_CONFIG_NS }));
    }

    const inboundKey = `${semanticObject}-${action}`;

    if (!overwrite && manifest['sap.app'].crossNavigation?.inbounds[inboundKey]) {
        throw Error(t('error.inboundExists', { inboundKey, ns: NAV_CONFIG_NS }));
    }

    const inbound = {
        [inboundKey]: {
            semanticObject,
            action,
            title: title || '',
            subTitle: subTitle || '',
            signature: {
                parameters: {},
                additionalParameters: 'allowed'
            }
        }
    };
    const crossNavigation: Manifest['sap.app']['crossNavigation'] = Object.assign(
        manifest['sap.app'].crossNavigation || {},
        {
            inbounds: mergeObjects(manifest['sap.app'].crossNavigation?.inbounds, inbound)
        }
    );

    fs.extendJSON(manifestPath, { 'sap.app': Object.assign(manifest['sap.app'], { crossNavigation }) });
    return fs;
}
