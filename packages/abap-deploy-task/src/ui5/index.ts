import type { TaskParameters } from '@ui5/builder';
import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { AbapDeployConfig } from '../types';
import { NAME } from '../types';
import { deploy, replaceEnvVariables, validateConfig } from '../base';
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

    options.configuration && logger.debug(options.configuration);
    const config = validateConfig(options.configuration);
    replaceEnvVariables(config);

    const archive = await createUi5Archive(logger, workspace, options);
    deploy(archive, config, logger);
}

export = task;
