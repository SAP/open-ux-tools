import type { AppWizard, Prompts } from '@sap-devx/yeoman-ui-types';
import type { BaseOptions } from 'yeoman-generator';
import type { ILogWrapper, TelemetryData } from '@sap-ux/fiori-generator-shared';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { ManifestNamespace, UI5FlexLayer } from '@sap-ux/project-access';
import type { IVSCodeExtLogger, LogLevel } from '@vscode-logging/logger';
export type FlpConfigOptions = BaseOptions & {
    /**
     * VSCode instance
     */
    vscode?: unknown;
    /**
     * Option to force the conflicter property of the yeoman environment (prevents additional prompt for overwriting files)
     */
    force?: boolean;
    /**
     * AppWizard instance
     */
    appWizard?: AppWizard;
    /**
     * Whether the generator is launched as a subgenerator
     */
    launchAsSubGen?: boolean;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Additional data for the generator
     */
    inbounds: ManifestNamespace.Inbound;
    /**
     * Layer for the FLP configuration
     */
    layer: UI5FlexLayer;
    /**
     * Prompts instance for handling user prompts
     */
    prompts?: Prompts;
    data?: {
        projectRootPath: string;
    };
    /**
     * Flag indicating whether this is a CF environment project
     */
    isCfProject?: boolean;
    /**
     * VSCode extension logger
     */
    logger?: IVSCodeExtLogger;
    /**
     * Log level for the generator
     */
    logLevel?: LogLevel;
    /**
     * Log wrapper instance
     */
    logWrapper?: ILogWrapper;
};

export interface State {
    provider?: AbapServiceProvider;
    credentialsPrompted?: boolean;
}
