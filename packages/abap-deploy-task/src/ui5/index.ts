import type { TaskParameters } from '@ui5/builder';
import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import { AbapDeployConfig, NAME } from '../types';
import { deploy, validateConfig } from '../base';
import { t } from '../messages';
import { createUi5Archive } from './archive';

/**
 * Custom task to upload the build result to the UI5 ABAP Repository.
 *
 * @param params
 * @param params.workspace
 * @param params.options
 */
async function task({ workspace, options }: TaskParameters<AbapDeployConfig>): Promise<void> {
    const logger = new ToolsLogger({
        transports: [new UI5ToolingTransport({ moduleName: `${NAME} ${options.projectName}` })],
        logLevel: (options.configuration?.log as LogLevel) ?? LogLevel.Info
    });

    logger.debug(options.configuration ?? {});
    const config = validateConfig(options.configuration);

    logger.info(t('CREATING_ARCHIVE_UI5'));
    const archive = await createUi5Archive(logger, workspace, options);
    logger.info(t('ARCHIVE_CREATED'));

    try {
        logger.info(t('STARTING_DEPLOYMENT', config.test));
        deploy(archive, config.target, config.app, config.test);
    } catch (e) {
        logger.error(t('DEPLOYMENT_FAILED'));
        logger.debug((e as Error).message);
        throw e;
    }
}

export = task;
