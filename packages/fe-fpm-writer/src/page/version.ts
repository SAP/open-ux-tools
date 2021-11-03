import { validateVersion } from '../common/version';
import { join } from 'path';

/**
 * Validate the UI5 version and if valid return the root folder for the templates to be used.
 *
 * @param ui5Version - optional minimum required UI5 version
 * @returns root folder  containg the templates if the version is supported otherwise throws an error
 */
export function getTemplateRoot(ui5Version?: number): string {
    validateVersion(ui5Version);
    if (ui5Version === undefined || ui5Version >= 1.94) {
        return join(__dirname, '../../templates/page/1.94');
    } else {
        return join(__dirname, '../../templates/page/1.84');
    }
}
