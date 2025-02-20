import type Generator from 'yeoman-generator';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { VSCodeInstance, TelemetryData, LogWrapper } from '@sap-ux/fiori-generator-shared';
import type { ManifestNamespace } from '@sap-ux/project-access';

export interface FlpConfigOptions extends Generator.GeneratorOptions {
    /**
     * VSCode instance
     */
    vscode?: VSCodeInstance;
    /**
     * AppWizard instance
     */
    appWizard?: AppWizard;
    /**
     * Whether the generator is launched as a subgenerator
     */
    launchFlpConfigAsSubGenerator?: boolean;
    /**
     * Path to the application root where the Fiori launchpad configuration will be added.
     */
    appRootPath?: string;
    /**
     * Skips the prompting phase
     */
    skipPrompt?: boolean;
    /**
     * FLP configuration answers
     */
    inboundConfig: Partial<ManifestNamespace.Inbound[string]>;
    /**
     * Option to force the conflicter property of the yeoman environment (prevents additional prompt for overwriting files)
     */
    force?: boolean;
    /**
     * Telemetry data to be send after deployment configuration has been added
     */
    telemetryData?: TelemetryData;
    /**
     * Option to overwrite existing configuration without prompting
     */
    overwrite?: boolean;
    /**
     * Data which may be passed from external sources e.g extensions like Application modeler
     */
    data?: {
        /**
         * Path to the application root where the Fiori launchpad configuration will be added.
         */
        appRootPath?: string;
        /**
         * Config for additional prompts
         */
        additionalPrompts?: {
            /**
             * Prompt to confirm the the update of non-productive configurations as they are centrally managed as part of the CI pipeline.
             */
            confirmConfigUpdate?: {
                /**
                 * Whether the prompt should be shown.
                 */
                show?: boolean;
                /**
                 * The type of configuration being updated. This will be added to the start of the prompt message.
                 */
                configType?: string;
            };
        };
    };
    /**
     * Logger instance
     */
    logWrapper?: LogWrapper;
}
