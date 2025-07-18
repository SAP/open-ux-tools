import type { Manifest } from 'sap/ui/rta/RuntimeAuthoring';

export type ApplicationType = 'fe-v2' | 'fe-v4' | 'freestyle';

/**
 * Determines application type based on the manifest.json.
 *
 * @param manifest - Application Manifest.
 * @returns Application type.
 */
export function getApplicationType(manifest: Manifest): ApplicationType {
    if (manifest['sap.ui.generic.app'] || manifest['sap.ovp']) {
        return 'fe-v2';
    } else if (manifest['sap.ui5']?.routing?.targets) {
        let hasV4pPages = false;
        Object.keys(manifest?.['sap.ui5']?.routing?.targets ?? []).forEach((target) => {
            if (manifest?.['sap.ui5']?.routing?.targets?.[target]?.name?.startsWith('sap.fe.templates.')) {
                hasV4pPages = true;
            }
        });
        if (hasV4pPages) {
            return 'fe-v4';
        }
    }

    return 'freestyle';
}
