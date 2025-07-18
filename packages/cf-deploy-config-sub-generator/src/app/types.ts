import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { CfDeployConfigPromptOptions, CfDeployConfigAnswers } from '@sap-ux/cf-deploy-config-inquirer';
import type { ApiHubConfig } from '@sap-ux/cf-deploy-config-writer';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';

export interface CfDeployConfigOptions extends CfDeployConfigAnswers {
    /**
     * VSCode instance
     */
    vscode?: unknown;
    /**
     * AppWizard instance
     */
    appWizard?: AppWizard;
    /**
     * Whether the generator is launched as a subgenerator
     */
    launchDeployConfigAsSubGenerator?: boolean;
    /**
     * Whether the generator is launched as a standalone generator in a YUI context
     */
    launchStandaloneFromYui?: boolean;
    /**
     * Path to the project root - this could be the base Fiori app, CAP project or App Router
     */
    projectRoot: string;
    /**
     * Path to the application
     */
    appRootPath: string;
    /**
     * The name of the base config file e.g. ui5.yaml
     */
    base?: string;
    /**
     * The name of the deploy config file e.g. ui5-deploy.yaml
     */
    config?: string;
    /**
     * The destination authentication type
     */
    destinationAuthType?: string;
    /**
     * Whether the destination is a full url destination
     */
    isFullUrlDest?: boolean;
    /**
     * Add CAP destination
     */
    addMTADestination: boolean;
    /**
     * Add cloud service name
     */
    cloudServiceName: string;
    /**
     * Only make local Fiori app changes when parent project is a CAP project
     */
    lcapModeOnly: boolean;
    /**
     * The API Hub configuration
     */
    apiHubConfig?: ApiHubConfig;
    /**
     * The service host used to connect during app generation
     */
    appGenServiceHost?: string;
    /**
     * The service path used to connect during app generation
     */
    appGenServicePath?: string;
    /**
     * Option to silentyl overwrite the existing deployment configuration
     */
    overwrite?: boolean;
    /**
     * Option to skip the installation of dependencies
     */
    skipInstall?: boolean;
    /**
     * Option to force the conflicter property of the yeoman environment (prevents additional prompt for overwriting files)
     */
    force?: boolean;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Option to invoke the getConfirmMtaContinue prompt
     */
    addCapMtaContinue?: boolean;
    /**
     * Prompts options for the CF deploy config inquirer
     */
    promptOptions?: CfDeployConfigPromptOptions;
}
