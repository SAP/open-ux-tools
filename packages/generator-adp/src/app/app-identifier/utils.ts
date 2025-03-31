import type { Manifest } from '@sap-ux/project-access';

/**
 * Evaluates whether the application described by the manifest is a SAP Fiori Elements version 4 application.
 *
 * @param {Manifest} manifest - The application manifest to evaluate.
 * @returns {boolean} True if the application uses SAP Fiori Elements version 4 libraries.
 */
export function isV4Application(manifest: Manifest | null): boolean {
    return !!manifest?.['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'];
}
