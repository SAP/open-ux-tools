import { Command } from 'commander';
import { getTelemetrySetting, setEnableTelemetry } from '@sap-ux/telemetry';
import { getLogger } from '../../tracing/index.js';
import { t } from '../../i18n.js';

/**
 * Returns the 'telemetry' command group with the subcommands 'enable', 'disable' and 'status'.
 * The setting is shared with the other SAP Fiori tools.
 *
 * @returns - commander command
 */
export function getTelemetryCommand(): Command {
    const telemetryCommand = new Command('telemetry').description(t('telemetry.command.description'));

    telemetryCommand
        .command('enable')
        .description(t('telemetry.command.enable'))
        .action(async () => {
            await changeTelemetrySetting(true);
        });
    telemetryCommand
        .command('disable')
        .description(t('telemetry.command.disable'))
        .action(async () => {
            await changeTelemetrySetting(false);
        });
    telemetryCommand
        .command('status')
        .description(t('telemetry.command.status'))
        .action(async () => {
            const setting = await getTelemetrySetting();
            const logger = getLogger();
            if (setting === undefined) {
                logger.info(t('telemetry.status.enabledByDefault'));
            } else {
                logger.info(t(setting.enableTelemetry ? 'telemetry.status.enabled' : 'telemetry.status.disabled'));
            }
        });

    return telemetryCommand;
}

/**
 * Persist the telemetry setting and verify that it has been saved, since `setEnableTelemetry` does not report write errors.
 *
 * @param enable - true to enable, false to disable telemetry
 */
async function changeTelemetrySetting(enable: boolean): Promise<void> {
    const logger = getLogger();
    await setEnableTelemetry(enable);
    const saved = await getTelemetrySetting();
    if (saved?.enableTelemetry === enable) {
        logger.info(t(enable ? 'telemetry.status.enabled' : 'telemetry.status.disabled'));
    } else {
        logger.error(t('telemetry.status.updateFailed'));
        process.exitCode = 1;
    }
}
