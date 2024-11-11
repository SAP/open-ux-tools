import Generator from 'yeoman-generator';
import { DefaultLogger, LogWrapper } from '@sap-ux/fiori-generator-shared';
import { t } from '../utils';
import type { LogLevel, IVSCodeExtLogger } from '@vscode-logging/logger';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';

/**
 * Base class for deployment generators.
 */
export abstract class DeploymentGenerator extends Generator {
    private static _logger: ILogWrapper = DefaultLogger;

    constructor(args: string | string[], options: Generator.GeneratorOptions) {
        super(args, options, {
            unique: 'namespace'
        });
        DeploymentGenerator._logger =
            this.options.logWrapper ??
            this._configureLogging(this.options.logLevel, this.options.logger, this.options.vscode);

        DeploymentGenerator.logger?.debug(t('debug.loggerInitialised'));
    }

    public static get logger(): ILogWrapper {
        return this._logger;
    }

    private _configureLogging(logLevel: LogLevel, vscLogger: IVSCodeExtLogger, vscode?: object): ILogWrapper {
        return new LogWrapper(this.rootGeneratorName(), this.log, logLevel, vscLogger, vscode);
    }
}
