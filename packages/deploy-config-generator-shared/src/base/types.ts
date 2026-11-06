import type { BaseOptions } from 'yeoman-generator';
import type { ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { LogLevel, IVSCodeExtLogger } from '@vscode-logging/logger';

/**
 * Options accepted by {@link DeploymentGenerator} on top of the base Yeoman options.
 * Yeoman v8's `BaseOptions` no longer carries an index signature, so the custom logging
 * options the base generator reads must be declared explicitly.
 */
export type DeploymentGeneratorOptions = BaseOptions & {
    logWrapper?: ILogWrapper;
    logLevel?: LogLevel;
    logger?: IVSCodeExtLogger;
    vscode?: object;
};
