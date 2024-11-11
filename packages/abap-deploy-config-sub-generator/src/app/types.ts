import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { AbapTarget } from '@sap-ux/ui5-config';

import Generator, { Answers } from 'yeoman-generator';
import { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-inquirer';
import { BackendTarget } from '@sap-ux/abap-deploy-config-inquirer/src/types';

export interface AbapGeneratorOptions {
    destinationRoot?: string;
    projectPath?: string;
    projectName?: string;
    launchDeployConfigAsSubGenerator?: boolean;
    skipInstall?: boolean;
    vscode?: unknown;
    appWizard?: AppWizard;
    telemetryData?: { [key: string]: any };
    force?: boolean;
    baseFile?: string;
    deployFile?: string;
}

export interface DeployTaskConfig {
    app: {
        name: string;
        description?: string;
        package?: string;
        transport: string;
        [key: string]: unknown;
    };
    target: BackendTarget;
    [key: string]: unknown;
}

export interface AbapGenerator {
    options: AbapGeneratorOptions;
    answers: AbapDeployConfigAnswersInternal;
    backendConfig: BackendTarget;
    appWizard: AppWizard;
    launchDeployConfigAsSubGenerator?: boolean;
    existingDeployTaskConfig?: DeployTaskConfig;
    abapTarget?: AbapTarget;
    serviceProvider?: AbapServiceProvider;
}
