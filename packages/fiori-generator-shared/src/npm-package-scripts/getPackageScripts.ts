import type { PackageJsonScripts, PackageScriptsOptions } from './types';
import { t } from '../i18n';
import { SCRIPT_FLP_SANDBOX } from '../constants';

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
function buildStartNoFLPCommand(localOnly: boolean, searchParams?: URLSearchParams): string {
    const searchParamString = searchParams?.toString();
    const searchParam = searchParamString ? `?${searchParamString}` : '';
    if (localOnly) {
        return `echo \\"${t('logMessages.info.mockOnlyWarning')}\\"`;
    }
    return `fiori run --open "/index.html${searchParam}"`;
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
function buildParams(searchParams?: URLSearchParams, flpAppId?: string): string {
    const hashFragment = flpAppId ? `#${flpAppId}` : '';
    const searchParam = searchParams ? `?${searchParams.toString()}` : '';
    return `${searchParam}${hashFragment}`;
}

/**
 * Constructs the command for the `start` script in `package.json`.
 *
 * @param {boolean} localOnly - Indicates whether only a local server is available. If `true`, a warning
 *                               message is returned instead of a command.
 * @param {string} params - The query parameters to be included in the command URL.
 * @param {string} [startFile] - The path to the file to be opened with the `start` command.
 *                                If not provided, defaults to `'/test/flpSandbox.html'`.
 * @returns {string} - The command for the `start` script, including either a warning message or the `fiori run`
 *                     command with the specified file and parameters.
 */
function buildStartCommand(localOnly: boolean, params: string, startFile?: string): string {
    if (localOnly) {
        return `echo \\"${t('logMessages.info.mockOnlyWarning')}\\"`;
    }
    return `fiori run --open "${startFile ?? SCRIPT_FLP_SANDBOX}${params}"`;
}

/**
 * Generates a variant management script in preview mode.
 * Default search parameters are added to the command if `addSearchParams` is `true`.
 * These parameters are necessary when virtual endpoints are not used.
 * When virtual endpoints are used, the search parameters are injected at runtime.
 *
 * @param {boolean} addSearchParams - Indicates whether to include search parameters in the command.
 * @param {string} [flpAppId] - The FLP application ID to use as the anchor in the preview URL.
 * @returns {string} A variant management script to run the application in preview mode.
 */
function getVariantPreviewAppScript(addSearchParams: boolean, flpAppId?: string): string {
    let previewAppAnchor = '#app-preview';
    if (addSearchParams && flpAppId) {
        previewAppAnchor = `#${flpAppId}`;
    }
    let urlParam = '';
    if (addSearchParams) {
        const disableCacheParam = 'sap-ui-xx-viewCache=false';
        urlParam = `?${[disableCacheParam, 'fiori-tools-rta-mode=true', 'sap-ui-rta-skip-flex-validation=true']
            .filter(Boolean)
            .join('&')}`;
    }
    // Please keep the special characters in the below command
    // as removing them may cause the browser to misinterpret the URI components without the necessary escaping and quotes.
    // eslint-disable-next-line no-useless-escape
    return `fiori run --open \"/preview.html${urlParam}${previewAppAnchor}\"`;
}

/**
 * Get an object reflecting the scripts that need to be added to the package.json.
 *
 * @param options Collection of mostly optional settings.
 * @param options.localOnly no server available
 * @param options.addMock add a script for using the mockserver
 * @param options.addTest add a script for executing OPA tests
 * @param options.flpAppId local FLP id
 * @param options.startFile path that should be opened with the start script
 * @param options.localStartFile path that should be opend with the start-local script
 * @param options.generateIndex exclude the start-noflp script
 * @param options.supportVirtualEndpoints whether to support virtual endpoints - search params will not be added as they are injected at runtime
 * @returns package.json scripts
 */
export function getPackageScripts({
    localOnly,
    addMock = true,
    addTest = false,
    flpAppId = '',
    startFile,
    localStartFile,
    generateIndex = true,
    supportVirtualEndpoints = false
}: PackageScriptsOptions): PackageJsonScripts {
    const viewCacheSearchParams = new URLSearchParams([['sap-ui-xx-viewCache', 'false']]);
    const queryParams = buildParams(supportVirtualEndpoints ? undefined : viewCacheSearchParams, flpAppId);

    const scripts: PackageJsonScripts = {
        start: buildStartCommand(localOnly, queryParams, startFile),
        'start-local': `fiori run --config ./ui5-local.yaml --open "${
            localStartFile ?? SCRIPT_FLP_SANDBOX
        }${queryParams}"`
    };

    if (generateIndex) {
        scripts['start-noflp'] = buildStartNoFLPCommand(localOnly, viewCacheSearchParams);
    }

    if (addMock) {
        scripts['start-mock'] = `fiori run --config ./ui5-mock.yaml --open "${
            localStartFile ?? SCRIPT_FLP_SANDBOX
        }${queryParams}"`;
    }

    if (addTest) {
        scripts['int-test'] = 'fiori run --config ./ui5-mock.yaml --open "/test/integration/opaTests.qunit.html"';
    }

    scripts['start-variants-management'] = localOnly
        ? `echo \\"${t('logMessages.info.mockOnlyWarning')}\\"`
        : getVariantPreviewAppScript(!supportVirtualEndpoints, flpAppId);

    return scripts;
}
