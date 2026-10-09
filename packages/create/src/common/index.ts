import { execNpmCommand } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
import { t } from '../i18n.js';
export { promptYUIQuestions } from './prompts.js';

/**
 * Run npm install command.
 *
 * @param basePath - path to application root
 * @param [installArgs] - optional string array of arguments
 * @param [options] - optional options
 * @param [options.logger] - optional logger instance
 */
export function runNpmInstallCommand(
    basePath: string,
    installArgs: string[] = [],
    options?: { logger?: Logger }
): Promise<Error | undefined> {
    const logger = options?.logger;
    return execNpmCommand(['install', ...installArgs], { cwd: basePath, logger: logger })
        .then(() => {
            logger?.info(t('npm.installSuccess'));
            return undefined;
        })
        .catch((error) => {
            const installError = error as Error;
            logger?.error(t('npm.installFailed', { error: installError.message }));
            return installError;
        });
}
