import { execNpmCommand } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
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
            logger?.info('npm install completed successfully.');
            return undefined;
        })
        .catch((error) => {
            const installError = error as Error;
            logger?.error(`npm install failed. '${installError.message}'`);
            return installError;
        });
}
