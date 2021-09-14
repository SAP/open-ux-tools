import { t } from '../i18n';

export function getStartTasks(
    localOnly: boolean,
    sapClientParam = '',
    flpAppId = '',
    startFile?: string,
    localStartFile?: string
): { 'start': string; 'start-local': string; 'start-noflp': string } {
    const flpAppNavId = flpAppId ? `#${flpAppId}` : '';
    const startCommand = localOnly
        ? `echo \\"${t('INFO_MSG_MOCK_ONLY_WARNING')}\\"`
        : `fiori run --open '${startFile || 'test/flpSandbox.html'}${sapClientParam}${flpAppNavId}'`;
    const startLocalCommand = `fiori run --config ./ui5-local.yaml --open '${localStartFile ||
        'test/flpSandboxMockServer.html'}${sapClientParam}${flpAppNavId}'`;
    const startNoFlpCommand = localOnly
        ? `echo \\"${t('INFO_MSG_MOCK_ONLY_WARNING')}\\"`
        : `fiori run --open '${'index.html'}${sapClientParam}'`;
    return {
        'start': startCommand,
        'start-local': startLocalCommand,
        'start-noflp': startNoFlpCommand
    };
}
