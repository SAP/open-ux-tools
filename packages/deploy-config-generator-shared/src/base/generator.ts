import Generator from 'yeoman-generator';
import { initI18n } from '../utils';
import { DefaultLogger, LogWrapper, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { LogLevel, IVSCodeExtLogger } from '@vscode-logging/logger';

/**
 * Base class for deployment generators.
 */
export abstract class DeploymentGenerator extends Generator {
    private static _logger: ILogWrapper = DefaultLogger;

    /**
     * Deployment generator constructor.
     *
     * @param args - arguments passed to the generator
     * @param options - options passed to the generator
     */
    constructor(args: string | string[], options: Generator.GeneratorOptions) {
        super(args, options, {
            unique: 'namespace'
        });
        DeploymentGenerator._logger =
            this.options.logWrapper ??
            this._configureLogging(this.options.logLevel, this.options.logger, this.options.vscode);
    }

    async initializing(): Promise<void> {
        await initI18n();
    }

    /**
     * Get the logger instance.
     *
     * @returns - logger instance
     */
    public static get logger(): ILogWrapper {
        return this._logger;
    }

    /**
     * Configure logging.
     *
     * @param logLevel - log level
     * @param vscLogger - vscode extension logger
     * @param vscode - vscode instance
     * @returns - log wrapper instance
     */
    private _configureLogging(logLevel: LogLevel, vscLogger: IVSCodeExtLogger, vscode?: object): ILogWrapper {
        return new LogWrapper(this.rootGeneratorName(), this.log, logLevel, vscLogger, vscode);
    }
}
