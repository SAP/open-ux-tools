import { t } from '../i18n';

export function getPackageTasks(
    localOnly: boolean,
    sapClientParam = '',
    flpAppId = '',
    startFile?: string,
    localStartFile?: string
): { 'start': string; 'start-local': string; 'start-noflp': string, 'start-mock': string } {
    const params = `${sapClientParam ?? ''}${flpAppId ? `#${flpAppId}` : ''}`;
    const startCommand = localOnly
        ? `echo \\"${t('INFO_MSG_MOCK_ONLY_WARNING')}\\"`
        : `fiori run --open '${startFile || 'test/flpSandbox.html'}${params}'`;
    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open '${localStartFile ||
        'test/flpSandbox.html'}${params}'`;
    const startNoFlpCommand = localOnly
        ? `echo \\"${t('INFO_MSG_MOCK_ONLY_WARNING')}\\"`
        : `fiori run --open '${'index.html'}${sapClientParam}'`;

    const mockTask = `fiori run --config ui5-mock.yaml --open 'test/flpSandbox.html${params}'`;
    return {
        'start': startCommand,
        'start-local': startLocalCommand,
        'start-noflp': startNoFlpCommand,
        'start-mock': mockTask
    };
}
