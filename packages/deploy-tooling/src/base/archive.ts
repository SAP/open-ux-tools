import AdmZip from 'adm-zip';
import type { AdaptationConfig } from '@sap-ux/axios-extension';

/**
 * Check whether a given zip files contains an adaptation project and if yes returns the contained manifest.appdesc_variant.
 *
 * @param archive buffer representing a zip file
 * @returns the descriptor as object if the archive contains an adaptation project otherwise undefined
 */
export function getAppDescriptorVariant(archive: Buffer): AdaptationConfig | undefined {
    try {
        const zip = new AdmZip(archive);
        const file = zip.getEntry('manifest.appdescr_variant');
        if (file) {
            return JSON.parse(file.getData().toString());
        } else {
            return undefined;
        }
    } catch (error) {
        return undefined;
    }
}
