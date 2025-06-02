import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type Generator from 'yeoman-generator';
import type { TelemetryData } from '@sap-ux/fiori-generator-shared';
import type { AbapTarget } from '@sap-ux/system-access';

export interface FlpConfigOptions extends Generator.GeneratorOptions {
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
     * Application ID (refference ID) of the base application
     */
    appId?: string;
    /**
     * ABAP target from ui5.yaml
     */
    target: AbapTarget;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Additional data for the generator
     */
    data?: {
        projectRootPath: string;
    };
}
