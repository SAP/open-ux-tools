import { t } from './i18n';

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
 * @description Generates the package.json scripts
 * @returns package.json scripts
 */
export function getPackageJsonTasks({
    localOnly,
    addMock = true,
    addTest = false,
    sapClient,
    flpAppId = '',
    startFile,
    localStartFile,
    generateIndex = true
}: {
    localOnly: boolean;
    addMock: boolean;
    addTest: boolean;
    sapClient?: string;
    flpAppId?: string;
    startFile?: string;
    localStartFile?: string;
    generateIndex?: boolean;
}): { start: string; 'start-local': string; 'start-noflp'?: string; 'start-mock'?: string } {
    // Build search param part of preview launch url
    const searchParamList: string[][] = [];
    if (sapClient) {
        searchParamList.push([`sap-client`, `${sapClient}`]);
    }
    searchParamList.push(['sap-ui-xx-viewCache', 'false']);

    let searchParam = new URLSearchParams(searchParamList).toString();
    searchParam = searchParam ? `?${searchParam}` : '';
    // Build fragment identifier part of url
    const hashFragment = flpAppId ? `#${flpAppId}` : '';
    // Full parameter section composed by search param and fragment identifier
    const params = `${searchParam}${hashFragment}`;

    const startCommand = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : `fiori run --open "${startFile || 'test/flpSandbox.html'}${params}"`;
    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open "${
        localStartFile || 'test/flpSandbox.html'
    }${params}"`;
    const startNoFlpCommand = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : `fiori run --open "${'index.html'}${searchParam}"`;

    const mockTask = `fiori run --config ./ui5-mock.yaml --open "test/flpSandbox.html${params}"`;
    const testTask = 'fiori run --config ./ui5-mock.yaml --open "test/integration/opaTests.qunit.html"';
    return Object.assign(
        {
            start: startCommand,
            'start-local': startLocalCommand
        },
        generateIndex
            ? {
                  'start-noflp': startNoFlpCommand
              }
            : {},
        addMock
            ? {
                  'start-mock': mockTask
              }
            : {},
        addTest
            ? {
                  'int-test': testTask
              }
            : {}
    );
}
