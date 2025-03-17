import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { TelemetryData } from '@sap-ux/fiori-generator-shared';

export interface AdpGeneratorOptions extends Generator.GeneratorOptions {
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
