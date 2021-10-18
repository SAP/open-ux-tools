import { t } from './i18n';

/**
 * Generates the package.json scripts
 *
 * @export
 * @param {{
 *     localOnly: boolean;
 *     addMock: boolean;
 *     sapClient?: string;
 *     flpAppId?: string;
 *     startFile?: string;
 *     localStartFile?: string;
 * }} {
 *     localOnly,
 *     addMock = true,
 *     sapClient,
 *     flpAppId = '',
 *     startFile,
 *     localStartFile
 * }
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
    const sapClientParam = sapClient ? `?sap-client=${sapClient}` : '';
    const params = `${sapClientParam ?? ''}${flpAppId ? `#${flpAppId}` : ''}`;
    const startCommand = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : `fiori run --open '${startFile || 'test/flpSandbox.html'}${params}'`;
    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open '${
        localStartFile || 'test/flpSandbox.html'
    }${params}'`;
    const startNoFlpCommand = localOnly
        ? `echo \\"${t('info.mockOnlyWarning')}\\"`
        : `fiori run --open '${'index.html'}${sapClientParam}'`;

    const mockTask = `fiori run --config ./ui5-mock.yaml --open 'test/flpSandbox.html${params}'`;
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
