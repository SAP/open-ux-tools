import type { Manifest } from '@sap-ux/project-access';

import { ApplicationType } from '../../../types';

/**
 * Checks if the given application type is a Fiori Elements application.
 *
 * @param {string} type - The application type to check.
 * @returns {boolean} True if the application is a Fiori Elements or Fiori Elements OVP app.
 */
export function isFioriElementsApp(type: string): boolean {
    return type === ApplicationType.FIORI_ELEMENTS || type === ApplicationType.FIORI_ELEMENTS_OVP;
}

/**
 * Determines if the application type is specifically a Fiori Elements Overview Page (OVP).
 *
 * @param {string} type - The application type to check.
 * @returns {boolean} True if the application type is Fiori Elements OVP.
 */
export function isOVPApp(type: string): boolean {
    return type === ApplicationType.FIORI_ELEMENTS_OVP;
}

/**
 * Checks if the application type is supported for adaptation projects.
 *
 * @param {string} type - The application type to evaluate.
 * @returns {boolean} True if the type is either Fiori Elements or a free style application.
 */
export function isSupportedType(type: string): boolean {
    return isFioriElementsApp(type) || type === ApplicationType.FREE_STYLE;
}

/**
 * Evaluates whether the application described by the manifest is a SAP Fiori Elements version 4 application.
 *
 * @param {Manifest} manifest - The application manifest to evaluate.
 * @returns {boolean} True if the application uses SAP Fiori Elements version 4 libraries.
 */
export function isV4Application(manifest: Manifest | null): boolean {
    return !!manifest?.['sap.ui5']?.dependencies?.libs?.['sap.fe.templates'];
}
