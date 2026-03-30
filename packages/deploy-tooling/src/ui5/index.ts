// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { TaskParameters } from '@ui5/builder';
import { LogLevel, ToolsLogger, UI5ToolingTransport } from '@sap-ux/logger';
import type { AbapDeployConfig } from '../types';
import { NAME } from '../types';
import { deploy, validateConfig } from '../base';
import { createUi5Archive } from './archive';
import { config as loadEnvConfig } from 'dotenv';
import { replaceEnvVariables } from '@sap-ux/ui5-config';

/**
 * Resolves a log level value from ui5.yaml configuration to a LogLevel enum value.
 * ui5.yaml delivers all scalar values as strings (e.g. "verbose"), but LogLevel is
 * a numeric enum. A numeric value is returned as-is; a string is matched
 * case-insensitively against the enum keys. Falls back to LogLevel.Info if
 * the value is absent or unrecognised.
 *
 * @param value - raw value from options.configuration.log
 * @returns resolved LogLevel
 */
function resolveLogLevel(value: string | number | undefined): LogLevel {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const key = Object.keys(LogLevel).find((k) => k.toLowerCase() === value.toLowerCase());
        if (key !== undefined) {
            return LogLevel[key as keyof typeof LogLevel];
        }
    }
    return LogLevel.Info;
}

/**
 * Custom task to upload the build result to the UI5 ABAP Repository.
 *
 * @param params - destructured input parameters
 * @param params.workspace - reference to the UI5 tooling workspace object
 * @param params.options - project properties and configuration
 */
async function task({ workspace, options }: TaskParameters<AbapDeployConfig>): Promise<void> {
    loadEnvConfig();
    const moduleName = `${NAME} ${options.projectName}`;
    const logLevel = resolveLogLevel(options.configuration?.log as string | number | undefined);
    const logger = new ToolsLogger({ transports: [new UI5ToolingTransport({ moduleName })], logLevel });

    if (logLevel >= LogLevel.Debug) {
        logger.debug({ ...options.configuration, credentials: undefined });
    }
    const config = validateConfig(options.configuration, logger);
    replaceEnvVariables(config);

    // The calling client can use either the projectNamespace or projectName when creating the workspace, needs to match when creating the archive.
    const archive = await createUi5Archive(
        logger,
        workspace,
        options.projectNamespace ?? options.projectName,
        config.exclude
    );
    await deploy(archive, config, logger);
}

export = task;
