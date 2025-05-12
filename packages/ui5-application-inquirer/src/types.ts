import type { CdsUi5PluginInfo } from '@sap-ux/project-access';
import type { CommonPromptOptions, PromptDefaultValue, UI5VersionChoice, YUIQuestion } from '@sap-ux/inquirer-common';
import type { AutocompleteQuestionOptions } from 'inquirer-autocomplete-prompt';

export interface UI5ApplicationAnswers {
    name?: string;
    title?: string;
    namespace?: string;
    description?: string;
    targetFolder?: string;
    ui5Version?: string;
    addDeployConfig?: boolean;
    addFlpConfig?: boolean;
    ui5Theme?: string;
    enableEslint?: boolean;
    enableCodeAssist?: boolean;
    skipAnnotations?: boolean;
    enableTypeScript?: boolean;
    enableVirtualEndpoints?: boolean;
    showAdvanced?: boolean;
}

/**
 * Enumeration of prompt names used by UI5ApplicationInquirerPromptOptions
 *
 */
export enum promptNames {
    /**
     * Application name
     */
    name = 'name',
    /**
     * Application title
     */
    title = 'title',
    /**
     * Application namespace
     */
    namespace = 'namespace',
    /**
     * Application description
     */
    description = 'description',
    /**
     * Target folder for generated application
     */
    targetFolder = 'targetFolder',
    /**
     * Application ui5 version
     */
    ui5Version = 'ui5Version',
    addDeployConfig = 'addDeployConfig',
    addFlpConfig = 'addFlpConfig',
    ui5Theme = 'ui5Theme',
    enableEslint = 'enableEslint',
    enableCodeAssist = 'enableCodeAssist',
    skipAnnotations = 'skipAnnotations',
    enableTypeScript = 'enableTypeScript',
    enableVirtualEndpoints = 'enableVirtualEndpoints',
    showAdvanced = 'showAdvanced'
}

type UI5VersionPromptOptions = {
    /**
     * Specifies the minimum UI5 version to consider when fetching UI5 versions
     */
    minUI5Version?: string;
    /**
     * Optionally include an Inquirer Separator for grouped UI5 versions
     */
    includeSeparators?: boolean;
    /**
     * Optionally register the `inquirer-autocomplete-prompt` plugin and use for UI5 version searching.
     * If the default `false` is used then standard prompting will be used that require scrolling to find entries.
     */
    useAutocomplete?: boolean;
    /**
     * Choice will be added to the UI5 versions offered and set as the default selection.
     * If the specified default choice is found in the ui5 version list it will be set as the
     * default. If it is not found it will be added as the first entry. In all cases the specified
     * default choice `name` property will be used as the label.
     *
     */
    defaultChoice?: UI5VersionChoice;
};

/**
 * Options for the enable TypeScript prompt. This allows for a default value to be determined based on the answers provided
 * and additonal runtime cds information if available. This effectively constains the prompt options for the enable TypeScript prompt
 * to be a function that returns a boolean value since enable TypeScript prompt default is conditional.
 */
type EnableTypeScriptPromptOptions = Omit<PromptDefaultValue<boolean>, 'default'> & {
    /**
     * Callback function to determine the default value for TypeScript
     */
    default?: boolean | ((answers: UI5ApplicationAnswers & { capCdsInfo?: CdsUi5PluginInfo }) => boolean);
};

type TargetFolderPromptOptions = {
    /**
     * The default target folder path to be used in combination with the prompt default function and the name prompt validation.
     * Use this instead of replacing the default function to keep the existing default function behaviour.
     * Note that if a `default` option is also provided then this will be used instead of the `defaultValue` option.
     */
    defaultValue?: string;
    /**
     * If set to `true`, the target folder prompt's validator will perform additional validation to
     * determine if the specified target path is contained in an existing Fiori application project path, which is invalid.
     *
     * **Behavior**:
     * - **CAP Projects**: Validates if the target folder is part of a CAP project with a supported Fiori app.
     * - **Non-CAP Projects**: Checks for recognised SAP Fiori apps, such as Fiori elements or SAPUI5
     *   freestyle apps that have the correct structure and required dependencies.
     * - **Validation Outcome**: Returns a validation message if the target folder meets the Fiori app criteria.
     *
     * If `false` or not provided, only ui5 project validation is performed without specific Fiori app checks.
     */
    validateFioriAppFolder?: boolean;
};

type NamePromptOptions = {
    /**
     * The default name value to be used in combination with the prompt default function and the target folder prompt validation.
     * Use this instead of replacing the default function to keep the existing default function behaviour.
     * Note that if a `default` option is also provided then this will be used instead of the `defaultValue` option.
     */
    defaultValue?: string;
};

/**
 * These are boolean value prompt option keys
 */
type booleanPromptKeys =
    | 'addDeployConfig'
    | 'addFlpConfig'
    | 'enableVirtualEndpoints'
    | 'enableEslint'
    | 'skipAnnotations'
    | 'enableTypeScript'
    | 'enableCodeAssist'
    | 'showAdvanced';

// Creates a general type for all string value prompt options
type stringValuePromptType = Omit<typeof promptNames, booleanPromptKeys>;
type stringValuePrompts = stringValuePromptType[keyof stringValuePromptType];

// Creates a general type for all boolean value prompt options
type booleanValuePromptType = Pick<typeof promptNames, booleanPromptKeys>;
type booleanValuePrompts = booleanValuePromptType[keyof booleanValuePromptType];

// Prompt options that can be assigned a default
type DefaultValueInputPrompts =
    | promptNames.name
    | promptNames.description
    | promptNames.namespace
    | promptNames.ui5Version
    | promptNames.targetFolder;
type DefaultValueConfirmPrompts = promptNames.enableCodeAssist | promptNames.enableEslint | promptNames.skipAnnotations;

/**
 * Defines prompt/question default values and/or whether or not they should be shown.
 */
export type UI5ApplicationCommonPromptOptions = {
    advancedOption?: boolean;
} & CommonPromptOptions;

/**
 * Provide the correct type checking for string value prompts and `ui5Version` options
 *
 */
type stringValuePromptOptions = Record<stringValuePrompts, UI5ApplicationCommonPromptOptions> &
    Record<DefaultValueInputPrompts, PromptDefaultValue<string>> &
    Record<promptNames.ui5Version, UI5VersionPromptOptions> &
    Record<promptNames.targetFolder, TargetFolderPromptOptions> &
    Record<promptNames.name, NamePromptOptions>;

/**
 * Provide the correct type checking for boolean value prompts and validator callback options
 *
 */
type booleanValuePromptOtions = Record<
    booleanValuePrompts,
    {
        /**
         * Callback function can be provided which will be executed on input validation.
         * This may be used, for example, to trigger conditional steps in Yeoman UI.
         *
         * @param answer
         * @param promptName
         * @returns
         */
        validatorCallback?: (answer: boolean, promptName: string) => void;
    } & UI5ApplicationCommonPromptOptions
> &
    Record<DefaultValueConfirmPrompts, PromptDefaultValue<boolean>> &
    Record<promptNames.enableTypeScript, EnableTypeScriptPromptOptions>;

export type UI5ApplicationQuestion = YUIQuestion<UI5ApplicationAnswers> &
    Partial<Pick<AutocompleteQuestionOptions, 'source'>>;

export type UI5ApplicationPromptOptions = Partial<stringValuePromptOptions & booleanValuePromptOtions>;
