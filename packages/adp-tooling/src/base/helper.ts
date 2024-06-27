import { isAppStudio } from '@sap-ux/btp-utils';
import { isFeatureEnabled } from '@sap-devx/feature-toggle-node';
import { isExtensionInstalledVsCode } from '@sap-ux/environment-check';

/**
 * Checks if the input is a non-empty string.
 *
 * @param input - input to check
 * @returns true if the input is a non-empty string
 */
export function isNotEmptyString(input: string | undefined): boolean {
    return typeof input === 'string' && input.trim().length > 0;
}

/**
 * Checks if the input is a valid SAP client.
 *
 * @param input - input to check
 * @returns true if the input is a valid SAP client
 */
export function isValidSapClient(input: string | undefined): boolean {
    return !input || (input.length < 4 && !!new RegExp(/^\d*$/).exec(input));
}

/**
 * Check environment is running in an internal scenario.
 *
 * @returns true if running in an internal scenario, false otherwise
 */
export async function isInternalUsage(): Promise<boolean> {
    if (isAppStudio()) {
        return await isFeatureEnabled('adaptation-project', 'internal');
    }

    return isExtensionInstalledVsCode('sap-ux-internal-extension');
}
