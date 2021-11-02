import { validateVersion } from '../common/version';
import { join } from 'path';

/**
 * Get the template folder for the given UI5 version.
 *
 * @param ui5Version required UI5 version.
 * @returns path to the template folder containing the manifest.json ejs template
 */
export function getManifestRoot(ui5Version?: number): string {
    validateVersion(ui5Version);
    if (ui5Version === undefined || ui5Version >= 1.86) {
        return join(__dirname, '../../templates/column/1.86');
    } else if (ui5Version === 1.85) {
        return join(__dirname, '../../templates/column/1.85');
    } else {
        return join(__dirname, '../../templates/column/1.84');
    }
}
