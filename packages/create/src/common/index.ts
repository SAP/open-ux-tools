import { execNpmCommand } from '@sap-ux/project-access';
import type { Logger } from '@sap-ux/logger';
export { promptYUIQuestions } from './prompts';

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
): void {
    const logger = options?.logger;
    execNpmCommand(['install', ...installArgs], { cwd: basePath, logger: logger })
        .then(() => {
            logger?.info('npm install completed successfully.');
        })
        .catch((error) => {
            logger?.error(`npm install failed. '${(error as Error).message}'`);
        });
}
