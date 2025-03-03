import type Generator from 'yeoman-generator';
import type { Question } from 'inquirer';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ApiHubConfig } from '@sap-ux/cf-deploy-config-writer';
import type { LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { OdataServiceAnswers } from '@sap-ux/odata-service-inquirer';

export interface DeployConfigOptions extends Generator.GeneratorOptions {
    /**
     * The target deployment
     */
    target?: string;

    /**
     * Instance of the AppWizard
     */
    appWizard: AppWizard;
    /**
     * Whether the deploy config should be launched as a sub generator
     * All prompts (CF & ABAP) wil be combined into one step
     */
    launchDeployConfigAsSubGenerator?: boolean;
    /**
     * Host URL passed from the generator
     */
    appGenServiceHost: string;
    /**
     * Service path passed from the generator
     */
    appGenServicePath: string;
    /**
     * Client passed from the generator
     */
    appGenClient: string;
    /**
     * The connected system from the generator
     */
    connectedSystem?: OdataServiceAnswers['connectedSystem'];
    /**
     * Whether the system is a cloud system
     */
    scp?: boolean;
    /**
     * Name of the project
     */
    projectName: string;
    /**
     * Path to the root of the project (target folder)
     */
    projectPath: string;
    /**
     * Telemetry data to be added to the deployment telemetry event
     */
    telemetryData?: Record<string, string>;
    /**
     * API Hub configuration
     */
    apiHubConfig?: ApiHubConfig;
    /**
     * Instance of the logger
     */
    logWrapper?: LogWrapper;
    /**
     * Optional data passed from extension e.g Application Modeler
     */
    data: {
        /**
         * Project folder root
         */
        destinationRoot: string;
        /**
         * Prompt to confirm the the update of non-productive configurations as they are centrally managed as part of the CI pipeline.
         */
        confirmConfigUpdatePrompt?: Question;
    };
}

/**
 * The deployment target (CF or ABAP)
 */
export interface Target {
    name: string;
    description: string;
}
