import type { AppWizard, Severity } from '@sap-devx/yeoman-ui-types';
import type Generator from 'yeoman-generator';
import type {
    FioriGeneratorSettings,
    FioriStep,
    Floorplan,
    FioriAppGeneratorPromptSettings,
    State,
    YeomanUiStepConfig
} from '../types';
import type { UI5ApplicationPromptOptions } from '@sap-ux/ui5-application-inquirer';

/**
 * Fiori generator specific options, for internal use only.
 * todo: Split this into FioriGenerator options (e.g. disableS4, disableGeneratorExtensions, data) that are explicitly root generator options
 * and FioriAppGenerator options which should be considered internal (passed from Fiori generator to FioriAppGenerator)
 */
// todo: -> ../types
export interface FioriAppGeneratorOptions extends Generator.GeneratorOptions, FioriGeneratorSettings {
    /**
     * Disables loading of S4 generator steps even if its found.
     * todo: External -> FioriGeneratorOptions
     */
    disableS4?: boolean;
    /**
     * Disables loading of generator extensions even if they are found
     * todo: External -> FioriGeneratorOptions
     */
    disableGeneratorExtensions?: boolean;
    /**
     * Additional (non-specified option) data may be passed using this property. e.g. Adaptor data
     * todo: External -> FioriGeneratorOptions
     */
    data?: object; // todo: Is this used anywhere? Adaptors set state directly
    /**
     * Customer provided extensions used to customize existing questions
     *
     * @deprecated Use `promptSettings` instead.
     */
    extensions?: UI5ApplicationPromptOptions;
    /**
     * The floorplan (app type) that will be created
     */
    floorplan?: Floorplan;
    /**
     * Prompt settings to control visibility, default values and other prompt related settings.
     */
    promptSettings?: FioriAppGeneratorPromptSettings;
    /**
     * Changes the launch config writing behaviour from detecting and creating/updating workspace files to only creating with the app target folder
     *
     * @default false
     */
    writeLaunchConfigstoAppOnly?: boolean;
    /**
     * Show template selection step even if only one template. In some cases callers of the generator may want users to be able to confirm the selected floorplan even if theres only one.
     *
     * @default false
     */
    showTemplateSelectionStepIfOnlyOne?: boolean;
    /**
     * Wizard messages may be shown on the first step adjacent to the navigation buttons using this option.
     * This enables callers of App Gen to set end-user messages specific to the context of the caller, for example BAS Storyboard flows.
     */
    wizardMessage?: {
        /**
         * The text of the message to show
         */
        text: string;
        /**
         * The severity of the notification. Default is `Severity.information`.
         */
        severity?: Severity;
        /**
         * A link may be included. Currently not supported by YUI.
         */
        link?: string;
    };
    /**
     * State set by composing generator i.e `@sap/fiori-generator`
     */
    state?: State;
    /**
     * App Wizard reference
     */
    appWizard?: AppWizard;
    /**
     * The telemetry data to be sent along with any telemetry events
     */
    telemetryData?: Record<string, unknown>;
    /**
     * Defined the steps configuration to be used in the Fiori generator. Skip steps by omitting them from the array.
     * Note that these should be aligned with `yeomanUiStepConfig`.
     */
    fioriSteps?: FioriStep[];
    /**
     * Defines the steps configuration to be used in the YUI generator.
     * Not applicable to CLI usage.
     */
    yeomanUiStepConfig?: YeomanUiStepConfig;
    /**
     * VSCode Workspace folders
     */
    workspaceFolders?: string[];
}
