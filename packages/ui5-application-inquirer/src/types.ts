import type { CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
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
    enableNPMWorkspaces?: boolean;
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
    enableNPMWorkspaces = 'enableNPMWorkspaces',
    enableCodeAssist = 'enableCodeAssist',
    skipAnnotations = 'skipAnnotations',
    enableTypeScript = 'enableTypeScript',
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
     * Choice will be added to the UI5 versions offered and set as the default selection
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
    default?: (answers: UI5ApplicationAnswers & { capCdsInfo?: CdsUi5PluginInfo }) => boolean;
};

type TargetFolderPromptOptions = {
    /**
     * The default target folder path to be used in combination with the prompt default function and the name prompt validation.
     * Use this instead of replacing the default function to keep the existing default function behaviour.
     * Note that if a `default` option is also provided then this will be used instead of the `defaultValue` option.
     */
    defaultValue?: string;
    /**
     * Determines whether to validate the target folder as a Fiori application project folder.
     * If `true`, `validateTargetFolder` will run `validateFioriAppProjectFolder`
     * to validate if the target path contains a Fiori project.
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
    | 'enableEslint'
    | 'skipAnnotations'
    | 'enableTypeScript'
    | 'enableCodeAssist'
    | 'showAdvanced'
    | 'enableNPMWorkspaces';

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
