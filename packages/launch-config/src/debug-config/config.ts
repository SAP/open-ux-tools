import { basename } from 'path';
import { getLaunchConfig } from '../launch-config-crud/utils';
import type { LaunchConfig, LaunchJSON, DebugOptions, LaunchConfigEnv } from '../types';
import { FIORI_TOOLS_LAUNCH_CONFIG_HANDLER_ID } from '../types';

// debug constants
const testFlpSandboxHtml = 'test/flpSandbox.html';
const indexHtml = 'index.html';
const testFlpSandboxMockServerHtml = 'test/flpSandboxMockServer.html';

/**
 * Returns the `migratorMockIntent` with a leading `#` if it doesn't already start with one.
 * If the input is undefined, it will return undefined.
 *
 * @param {string} [migratorMockIntent] - The optional mock intent string to be used in the migrator.
 * @returns {string | undefined} - The migrator mock intent prefixed with `#` or undefined.
 */
export function getMigratorMockIntentWithHash(migratorMockIntent?: string): string | undefined {
    if (!migratorMockIntent) {
        return undefined;
    }
    return migratorMockIntent.startsWith('#') ? migratorMockIntent : `#${migratorMockIntent}`;
}

/**
 * Determines the parameters to use for the mock HTML file based on the given inputs.
 * If the `targetMockHtmlFile` is `testFlpSandboxMockServerHtml` and `migratorMockIntentWithHash` is provided,
 * it will return `migratorMockIntentWithHash`. Otherwise, it defaults to `flpAppIdWithHash` or empty string.
 *
 * @param {string | undefined} targetMockHtmlFile - The target mock HTML file.
 * @param {string | undefined} [migratorMockIntentWithHash] - The migrator mock intent.
 * @param {string | undefined} [flpAppIdWithHash] - The FLP app ID with a leading `#`.
 * @returns {string} - The parameters to use, either `migratorMockIntentWithHash` or `flpAppIdWithHash`, defaults to an empty string.
 */
export function getParamsForMockHtml(
    targetMockHtmlFile: string | undefined,
    migratorMockIntentWithHash?: string,
    flpAppIdWithHash?: string
): string {
    if (targetMockHtmlFile === testFlpSandboxMockServerHtml && migratorMockIntentWithHash) {
        return migratorMockIntentWithHash;
    }
    return flpAppIdWithHash ?? '';
}

/**
 * Generates the command-line arguments required to start the mock server based on the OData version and whether it's a migrator.
 * If the OData version is `2.0` and it's a migrator, it opens the `targetMockHtmlFile`.
 * Otherwise, it uses `testFlpSandboxHtml`.
 *
 * @param {boolean} isMigrator - Indicates whether the application is being migrated.
 * @param {string} odataVersion - The version of OData being used (`2.0` or `4.0`).
 * @param {string | undefined} targetMockHtmlFile - The target mock HTML file, can be `undefined`.
 * @param {string} params - The parameters to append to the mock HTML file.
 * @returns {string[]} - The command arguments used for starting flp sandbox html.
 */
export function getMockCmdArgs(
    isMigrator: boolean,
    odataVersion: string,
    targetMockHtmlFile: string | undefined,
    params: string
): string[] {
    if (isMigrator && odataVersion === '2.0') {
        return ['--open', `${targetMockHtmlFile ?? testFlpSandboxHtml}${params}`];
    }
    return ['--config', './ui5-mock.yaml', '--open', `${testFlpSandboxHtml}${params}`];
}

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
 * Gets launch configuration.
 *
 * @param {string} name - The name of the configuration.
 * @param {string} cwd - The current working directory.
 * @param {string[]} runtimeArgs - The runtime arguments.
 * @param {string[]} cmdArgs - The command arguments.
 * @param {object} envVars - Environment variables for the configuration.
 * @param {string} [runConfig] - The optional run configuration for AppStudio.
 * @returns {LaunchConfig} The launch configuration object.
 */
function configureLaunchConfig(
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
 * @param rootFolder - The root folder path where the app will be generated.
 * @param {string} cwd - The current working directory.
 * @param {DebugOptions} configOpts - Configuration options for the launch.json file.
 * @returns {LaunchJSON} The configured launch.json object.
 */
export function configureLaunchJsonFile(rootFolder: string, cwd: string, configOpts: DebugOptions): LaunchJSON {
    const {
        isAppStudio,
        addStartCmd = true,
        flpAppId,
        flpSandboxAvailable,
        sapClientParam,
        odataVersion,
        isMigrator = false,
        isFioriElement,
        migratorMockIntent,
        targetMockHtmlFile
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

    // Add start command confugurations only if addStartCmd is enabled
    if (addStartCmd) {
        const startCommand = `${startHtmlFile}${flpAppIdWithHash}`;
        const liveConfig = configureLaunchConfig(
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
    if (odataVersion && ['2.0', '4.0'].includes(odataVersion)) {
        const migratorMockIntentWithHash = getMigratorMockIntentWithHash(migratorMockIntent);
        const params = getParamsForMockHtml(targetMockHtmlFile, migratorMockIntentWithHash, flpAppIdWithHash);
        const mockCmdArgs = getMockCmdArgs(isMigrator, odataVersion, targetMockHtmlFile, params);
        const mockConfig = configureLaunchConfig(
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
    const shouldUseMockServer = isFioriElement && odataVersion === '2.0' && isMigrator;
    const localHtmlFile = shouldUseMockServer ? testFlpSandboxMockServerHtml : startHtmlFile;
    const startLocalCommand = `${localHtmlFile}${
        migratorMockIntent ? `#${migratorMockIntent.replace('#', '')}` : flpAppIdWithHash
    }`;
    const localConfig = configureLaunchConfig(
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
