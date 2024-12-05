import type { AbapDeployConfigAnswersInternal } from '@sap-ux/abap-deploy-config-inquirer';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ConnectedSystem } from '@sap-ux/deploy-config-generator-shared';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';

export interface AbapDeployConfigOptions extends AbapDeployConfigAnswersInternal {
    vscode?: unknown;
    appWizard?: AppWizard;
    launchDeployConfigAsSubGenerator?: boolean;
    launchStandaloneFromYui?: boolean;
    destinationRoot?: string;
    projectPath?: string;
    projectName?: string;
    connectedSystem?: ConnectedSystem;
    base?: string;
    config?: string;
    skipInstall?: boolean;
    force?: boolean;
    telemetryData?: TelemetryData;
}

export enum DeployProjectType {
    Application = 'application',
    Library = 'library'
}
