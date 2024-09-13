import { DatasourceType, OdataVersion } from '@sap-ux/odata-service-inquirer';
import { basename } from 'path';
import { getLaunchConfig } from '../launch-config-crud/utils';
import type { LaunchConfig, LaunchJSON, DebugOptions, LaunchConfigEnv } from '../types';
import { FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID } from '../types';

// debug constants
const testFlpSandboxHtml = 'test/flpSandbox.html';
const indexHtml = 'index.html';
const testFlpSandboxMockServerHtml = 'test/flpSandboxMockServer.html';

/**
 * Generates a URL query string with an optional SAP client parameter and a disable cache parameter.
 *
 * @param {string} sapClientParam - The SAP client parameter to be included in the URL query string.
 * @returns {string} A formatted URL query string containing the SAP client parameter and disable cache parameter.
 * @example
 *  const urlParam = getEnvUrlParams('testsapclinet');
 * // Returns 'testsapclinet&sap-ui-xx-viewCache=false'
 * @example
 * const urlParam = getEnvUrlParams('');
 * // Returns 'sap-ui-xx-viewCache=false'
 */
function getEnvUrlParams(sapClientParam: string): string {
    const disableCacheParam = 'sap-ui-xx-viewCache=false';
    return sapClientParam ? `${sapClientParam}&${disableCacheParam}` : disableCacheParam;
}

/**
 * Creates a launch configuration.
 *
 * @param {string} name - The name of the configuration.
 * @param {string} cwd - The current working directory.
 * @param {string[]} runtimeArgs - The runtime arguments.
 * @param {string[]} cmdArgs - The command arguments.
 * @param {object} envVars - Environment variables for the configuration.
 * @param {string} [runConfig] - The optional run configuration for AppStudio.
 * @returns {LaunchConfig} The launch configuration object.
 */
function createLaunchConfig(
    name: string,
    cwd: string,
    runtimeArgs: string[],
    cmdArgs: string[],
    envVars: LaunchConfigEnv,
    runConfig?: string
): LaunchConfig {
    const config = getLaunchConfig(name, cwd, runtimeArgs, cmdArgs, envVars);
    if (runConfig) {
        // runConfig is only used in BAS
        config.env['run.config'] = runConfig;
    }
    return config;
}

/**
 * Configures the launch.json file based on provided options.
 *
 * @param rootFolder
 * @param {string} cwd - The current working directory.
 * @param {DebugOptions} configOpts - Configuration options for the launch.json file.
 * @returns {LaunchJSON} The configured launch.json object.
 */
export function configureLaunchJsonFile(rootFolder: string, cwd: string, configOpts: DebugOptions): LaunchJSON {
    const {
        isAppStudio,
        datasourceType,
        flpAppId,
        flpSandboxAvailable,
        sapClientParam,
        odataVersion,
        isMigrator,
        isFioriElement,
        migratorMockIntent
    } = configOpts;
    const projectName = basename(rootFolder);
    const flpAppIdWithHash = flpAppId && !flpAppId.startsWith('#') ? `#${flpAppId}` : flpAppId;
    const startHtmlFile = flpSandboxAvailable ? testFlpSandboxHtml : indexHtml;
    const runConfig = isAppStudio
        ? JSON.stringify({
              handlerId: FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID,
              runnableId: rootFolder
          })
        : undefined;
    const envUrlParam = getEnvUrlParams(sapClientParam);

    const launchFile: LaunchJSON = { version: '0.2.0', configurations: [] };

    // Add live configuration if the datasource is not from a metadata file
    if (datasourceType !== DatasourceType.metadataFile) {
        const startCommand = `${startHtmlFile}${flpAppIdWithHash}`;
        const liveConfig = createLaunchConfig(
            `Start ${projectName}`,
            cwd,
            ['fiori', 'run'],
            ['--open', startCommand],
            { DEBUG: '--inspect', FIORI_TOOLS_URL_PARAMS: envUrlParam },
            runConfig
        );
        launchFile.configurations.push(liveConfig);
    }

    // Add mock configuration for OData V2 or V4
    if (odataVersion && [OdataVersion.v2, OdataVersion.v4].includes(odataVersion)) {
        const params = `${flpAppIdWithHash ?? ''}`;
        const mockCmdArgs =
            isMigrator && odataVersion === OdataVersion.v2
                ? ['--open', `${testFlpSandboxMockServerHtml}${params}`]
                : ['--config', './ui5-mock.yaml', '--open', `${testFlpSandboxHtml}${params}`];
        const mockConfig = createLaunchConfig(
            `Start ${projectName} Mock`,
            cwd,
            ['fiori', 'run'],
            mockCmdArgs,
            { FIORI_TOOLS_URL_PARAMS: envUrlParam },
            runConfig
        );
        launchFile.configurations.push(mockConfig);
    }

    // Add local configuration
    const shouldUseMockServer = isFioriElement && odataVersion === OdataVersion.v2 && isMigrator;
    const localHtmlFile = shouldUseMockServer ? testFlpSandboxMockServerHtml : startHtmlFile;
    const startLocalCommand = `${localHtmlFile}${
        migratorMockIntent ? `#${migratorMockIntent.replace('#', '')}` : flpAppIdWithHash
    }`;
    const localConfig = createLaunchConfig(
        `Start ${projectName} Local`,
        cwd,
        ['fiori', 'run'],
        ['--config', './ui5-local.yaml', '--open', startLocalCommand],
        { FIORI_TOOLS_URL_PARAMS: envUrlParam },
        runConfig
    );
    launchFile.configurations.push(localConfig);

    return launchFile;
}
