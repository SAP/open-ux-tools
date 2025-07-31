import { isAppStudio } from '@sap-ux/btp-utils';
import { isExtensionInstalled } from '@sap-ux/fiori-generator-shared';

const ADP_VE_BAS_EXT_ID = 'SAP.adp-ve-bas-ext';

/**
 * Determines whether we can present an environemnt choice to the user.
 *
 * @param vscode Thge VS Code env instance.
 * @returns {boolean} True if the target environemnt can be selected.
 */
export function isTargetEnvironmentConfigurable(vscode: any): boolean {
    return isAppStudio() && isExtensionInstalled(vscode, ADP_VE_BAS_EXT_ID);
}
