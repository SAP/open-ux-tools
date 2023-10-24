import AdmZip from 'adm-zip';

/**
 * Check whether a given zip files contains an adaptation project and if yes returns the contained manisfest.appdesc_variant.
 *
 * @param archive buffer representing a zip file
 * @returns the descriptor as object if the archive contains an adaptation project otherwise undefined
 */
export function getAppDescriptorVariant(
    archive: Buffer
): { namespace: string; layer: 'CUSTOMER_BASE' | 'VENDOR' } | undefined {
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
