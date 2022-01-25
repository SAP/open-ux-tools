import { t } from './i18n';

/**
 * Get and object reflecting the scripts that need to be added to the package.json.
 *
 * @param options Collection of mostly optional settings.
 * @param options.localOnly no server available
 * @param options.addMock add a script for using the mockserver
 * @param options.sapClient SAP client required for connecting to the backend
 * @param options.flpAppId local FLP id
 * @param options.startFile path that should be opened with the start script
 * @param options.localStartFile path that should be opend with the start-local script
 * @description Generates the package.json scripts
 * @returns package.json scripts
 */
export function getPackageJsonTasks({
    localOnly,
    addMock = true,
    sapClient,
    flpAppId = '',
    startFile,
    localStartFile
}: {
    localOnly: boolean;
    addMock: boolean;
    sapClient?: string;
    flpAppId?: string;
    startFile?: string;
    localStartFile?: string;
}): { start: string; 'start-local': string; 'start-noflp': string; 'start-mock'?: string } {

    const addParams = [['sap-ui-xx-viewCache', 'false']];
    if (sapClient) {
        addParams.push([`sap-client`, `${sapClient}`]);
    }
    const searchParams = new URLSearchParams(addParams);
    const flpParams = `?${searchParams}${flpAppId ? `#${flpAppId}` : ''}`;

    const startCommand = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : `fiori run --open '${startFile || 'test/flpSandbox.html'}${flpParams}'`;

    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open '${
        localStartFile || 'test/flpSandbox.html'
    }${flpParams}'`;

    const startNoFlpCommand = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : `fiori run --open '${'index.html?'}${searchParams}'`;

    const mockTask = `fiori run --config ./ui5-mock.yaml --open 'test/flpSandbox.html${flpParams}'`;
    return Object.assign(
        {
            start: startCommand,
            'start-local': startLocalCommand,
            'start-noflp': startNoFlpCommand
        },
        addMock
            ? {
                  'start-mock': mockTask
              }
            : {}
    );
}
