import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-inquirer';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ConnectedSystem } from '@sap-ux/deploy-config-generator-shared';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';

export interface AbapDeployConfigOptions extends AbapDeployConfigAnswersInternal {
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
     * Whether the generator is launched as a standalone generator
     */
    launchStandaloneFromYui?: boolean;
    /**
     * Path to the project
     */
    destinationRoot?: string;
    /**
     * Path to the project root
     */
    projectPath?: string;
    /**
     * Path to the project name
     */
    projectName?: string;
    /**
     * The connected destination or backend system and service provider
     */
    connectedSystem?: ConnectedSystem;
    /**
     * The name of the base config file e.g. ui5.yaml
     */
    base?: string;
    /**
     * The name of the config file e.g. ui5-deploy.yaml
     */
    config?: string;
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
}

export enum DeployProjectType {
    Application = 'application',
    Library = 'library'
}
