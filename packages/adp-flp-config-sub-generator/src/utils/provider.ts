import { type AxiosRequestConfig, type ProviderConfiguration, type AbapServiceProvider } from '@sap-ux/axios-extension';
import { type AdpPreviewConfig } from '@sap-ux/adp-tooling';
import { type CredentialsAnswers } from '@sap-ux/inquirer-common';
import type { ToolsLogger } from '@sap-ux/logger';
import { createAbapServiceProvider } from '@sap-ux/system-access';

/**
 * Creates and returns an instance of AbapServiceProvider using the current UI5 YAML configuration and credentials.
 *
 * @param {AdpPreviewConfig} ui5Yaml - The UI5 YAML configuration containing the target ABAP system details.
 * @param {ToolsLogger} logger - The logger instance for logging messages.
 * @param {CredentialsAnswers} [credentials] - Optional credentials for authentication against the ABAP system.
 * @returns {Promise<AbapServiceProvider>} The ABAP service provider instance.
 */
export async function getAbapServiceProvider(
    ui5Yaml: AdpPreviewConfig,
    logger: ToolsLogger,
    credentials?: CredentialsAnswers
): Promise<AbapServiceProvider> {
    const { target, ignoreCertErrors = false } = ui5Yaml;
    const requestOptions: AxiosRequestConfig & Partial<ProviderConfiguration> = { ignoreCertErrors };
    if (credentials) {
        requestOptions['auth'] = { username: credentials.username, password: credentials.password };
    }
    return createAbapServiceProvider(target, requestOptions, false, logger);
}
