import { t } from './i18n';
import type { PackageJsonScripts } from './types';
import { getVariantPreviewAppScript } from '@sap-ux/fiori-generator-shared';

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
}): PackageJsonScripts {
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
        : // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          `fiori run --open "${startFile || 'test/flpSandbox.html'}${params}"`;

    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open "${
        //eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        localStartFile || 'test/flpSandbox.html'
    }${params}"`;

    const scripts: PackageJsonScripts = {
        start: startCommand,
        'start-local': startLocalCommand
    };

    if (generateIndex) {
        scripts['start-noflp'] = localOnly
            ? `echo \\"${t('info.mockOnlyWarning')}\\"`
            : `fiori run --open "${'index.html'}${searchParam}"`;
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
