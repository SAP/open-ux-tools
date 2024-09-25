import type { PackageJsonScripts, PackageScriptsOptions } from './types';
import { t } from './i18n';

/**
 * Builds the command for the `start-noflp` script in `package.json`.
 *
 * This command is used to start the application without the FLP configuration.
 *
 * @param {boolean} localOnly - Indicates whether only a local server is available. If `true`,
 *                               a warning message is returned instead of a command.
 * @param {URLSearchParams} searchParams - The search parameters to be included in the command URL.
 * @returns {string} - The command to be used in the `start-noflp` script. If `localOnly` is `true`,
 *                     returns a warning message. Otherwise, returns a `fiori run` command with the
 *                     appropriate parameters.
 */
function buildStartNoFLPCommand(localOnly: boolean, searchParams: URLSearchParams): string {
    const searchParamString = searchParams.toString();
    const searchParam = searchParamString ? `?${searchParamString}` : '';
    if (localOnly) {
        return `echo \\"${t('info.mockOnlyWarning')}\\"`;
    }
    return `fiori run --open "index.html${searchParam}"`;
}

/**
 * Constructs a `URLSearchParams` object with the specified query parameters.
 *
 * This function creates a `URLSearchParams` instance and appends the `sap-client` parameter if provided,
 * along with a default `sap-ui-xx-viewCache` parameter set to `false`.
 *
 * @param {string} [sapClient] - The SAP client value to be included as a query parameter.
 * @returns {URLSearchParams} - The `URLSearchParams` object containing the specified query parameters.
 */
function buildSearchParams(sapClient?: string): URLSearchParams {
    const params = new URLSearchParams();
    if (sapClient) {
        params.append('sap-client', sapClient);
    }
    params.append('sap-ui-xx-viewCache', 'false');
    return params;
}

/**
 * Constructs a URL parameter string from search parameters and an optional FLP app ID.
 *
 * @param {URLSearchParams} searchParams - The search parameters to include in the query string.
 * @param {string} [flpAppId] - The FLP app ID to be included as a fragment identifier.
 *                               If not provided, the fragment identifier will be omitted.
 * @returns {string} - A string representing the combined query parameters and fragment identifier.
 *                      If `searchParams` is empty, only the fragment identifier will be included.
 */
function buildParams(searchParams: URLSearchParams, flpAppId: string): string {
    const searchParamString = searchParams.toString();
    const searchParam = searchParamString ? `?${searchParamString}` : '';
    const hashFragment = flpAppId ? `#${flpAppId}` : '';
    return `${searchParam}${hashFragment}`;
}

/**
 * Constructs the command for the `start` script in `package.json`.
 *
 * @param {boolean} localOnly - Indicates whether only a local server is available. If `true`, a warning
 *                               message is returned instead of a command.
 * @param {string} params - The query parameters to be included in the command URL.
 * @param {string} [startFile] - The path to the file to be opened with the `start` command.
 *                                If not provided, defaults to `'test/flpSandbox.html'`.
 * @returns {string} - The command for the `start` script, including either a warning message or the `fiori run`
 *                     command with the specified file and parameters.
 */
function buildStartCommand(localOnly: boolean, params: string, startFile?: string): string {
    if (localOnly) {
        return `echo \\"${t('info.mockOnlyWarning')}\\"`;
    }
    return `fiori run --open "${startFile ?? 'test/flpSandbox.html'}${params}"`;
}

/**
 * Generates a variant management script in preview mode.
 *
 * @param {string} sapClient - The SAP client parameter to include in the URL. If not provided, the URL will not include the `sap-client` parameter.
 * @returns {string} A variant management script to run the application in preview mode.
 */
function getVariantPreviewAppScript(sapClient?: string): string {
    const previewAppAnchor = '#preview-app';
    const disableCacheParam = 'sap-ui-xx-viewCache=false';
    const sapClientParam = sapClient ? `&sap-client=${sapClient}` : '';
    const urlParam = `?${[
        sapClientParam,
        disableCacheParam,
        'fiori-tools-rta-mode=true',
        'sap-ui-rta-skip-flex-validation=true'
    ]
        .filter(Boolean)
        .join('&')}`;
    // eslint-disable-next-line no-useless-escape
    // eslint-disable-next-line sonarjs/no-duplicate-string
    return `fiori run --open \"preview.html${urlParam}${previewAppAnchor}\"`;
}

/**
 * Get an object reflecting the scripts that need to be added to the package.json.
 *
 * @param options Collection of mostly optional settings.
 * @param options.localOnly no server available
 * @param options.addMock add a script for using the mockserver
 * @param options.addTest add a script for executing OPA tests
 * @param options.sapClient SAP client required for connecting to the backend
 * @param options.flpAppId local FLP id
 * @param options.startFile path that should be opened with the start script
 * @param options.localStartFile path that should be opend with the start-local script
 * @param options.generateIndex exclude the start-noflp script
 * @returns package.json scripts
 */
export function getPackageScripts({
    localOnly,
    addMock = true,
    addTest = false,
    sapClient,
    flpAppId = '',
    startFile,
    localStartFile,
    generateIndex = true
}: PackageScriptsOptions): PackageJsonScripts {
    const searchParams = buildSearchParams(sapClient);
    const params = buildParams(searchParams, flpAppId);

    const scripts: PackageJsonScripts = {
        start: buildStartCommand(localOnly, params, startFile),
        'start-local': `fiori run --config ./ui5-local.yaml --open "${
            localStartFile ?? 'test/flpSandbox.html'
        }${params}"`
    };

    if (generateIndex) {
        scripts['start-noflp'] = buildStartNoFLPCommand(localOnly, searchParams);
    }

    if (addMock) {
        scripts['start-mock'] = `fiori run --config ./ui5-mock.yaml --open "test/flpSandbox.html${params}"`;
    }

    if (addTest) {
        scripts['int-test'] = 'fiori run --config ./ui5-mock.yaml --open "test/integration/opaTests.qunit.html"';
    }

    scripts['start-variants-management'] = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : getVariantPreviewAppScript(sapClient);

    return scripts;
}
