import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { CfAppRouterDeployConfigAnswers } from '@sap-ux/cf-deploy-config-inquirer';

export interface CfApprouterGenOptions extends Generator.GeneratorOptions, CfAppRouterDeployConfigAnswers {
    // YUI only
    destinationRoot?: string;
    appWizard?: AppWizard;
    skipInstall?: boolean;
}
