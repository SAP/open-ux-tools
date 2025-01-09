import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { Manifest } from '@sap-ux/project-access';
import type Generator from 'yeoman-generator';

export interface FlpConfigOptions extends Generator.GeneratorOptions {
    force?: boolean;
    appWizard?: AppWizard;
    launchAsSubGen?: boolean;
    manifest: Manifest;
    data?: {
        projectRootPath: string;
    };
}
