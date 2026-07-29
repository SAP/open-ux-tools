import type { Manifest } from '../project-spec-types.js';

/**
 * Adapts minUI5Version in manifest by removing 'snapshot' from version strings
 *
 * @param manifestJson - The manifest object to modify
 * @returns true if the manifest was modified and should be saved
 */
export function adaptMinUI5Version(manifestJson: Manifest): boolean {
    const minUI5Version = manifestJson['sap.ui5']?.dependencies?.minUI5Version;
    if (manifestJson['sap.ui5'] && minUI5Version) {
        const minUI5VersionArray: string[] = Array.isArray(minUI5Version) ? minUI5Version : [minUI5Version];
        for (let index = 0; index < minUI5VersionArray.length; index++) {
            const minUI5Version = minUI5VersionArray[index];
            if (minUI5Version?.toLowerCase()?.includes('snapshot')) {
                //remove snapshot and trailing dash
                minUI5VersionArray[index] = minUI5Version.replace(/snapshot/gi, '').replace(/-([^-]*)$/, '$1');
            }
        }
        if (minUI5VersionArray.length > 1) {
            manifestJson['sap.ui5'].dependencies.minUI5Version = minUI5VersionArray;
        } else {
            manifestJson['sap.ui5'].dependencies.minUI5Version = minUI5VersionArray[0];
        }
        return true;
    }
    return false;
}
