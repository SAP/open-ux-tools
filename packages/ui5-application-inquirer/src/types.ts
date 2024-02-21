import type { PromptSeverityMessage, UI5VersionChoice, validate } from '@sap-ux/inquirer-common';
import type { AsyncDynamicQuestionProperty } from 'inquirer';

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
     * Specifies the miminum UI5 version to consider when fetching UI5 versions
     */
    minUI5Version?: string;
    /**
     * Optionally include an Inquirer Separator for grouped UI5 versions
     */
    includeSeparators?: boolean;
    /**
     * Optionally register the `inquirer-autocomplete-prompt` plugin and use for UI5 version searching.
     * If the default `false` is used then standard prompting will be used that require scrolling to find entries.
     * // todo: consider removing and referencing if CLI instead
     */
    useAutocomplete?: boolean;
    /**
     * Choice will be added to the UI5 versions offered and set as the default selection
     *
     */
    defaultChoice?: UI5VersionChoice;
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
type DefaultValueInputPrompts = promptNames.name | promptNames.ui5Version | promptNames.targetFolder;
type DefaultValueConfirmPrompts =
    | promptNames.enableCodeAssist
    | promptNames.enableEslint
    | promptNames.skipAnnotations
    | promptNames.enableTypeScript;

// Default value type for input prompt options
export type PromptDefaultValue<T> = {
    default?: AsyncDynamicQuestionProperty<T>;
};

/**
 * Defines prompt/question default values and/or whether or not they should be shown.
 */
export type CommonPromptOptions = {
    hide?: boolean;
    advancedOption?: boolean;
    validate?: validate<UI5ApplicationAnswers>;
    additionalMessages?: PromptSeverityMessage;
};

/**
 * Provide the correct type checking for string value prompts and `ui5Version` options
 *
 */
type stringValuePromptOptions = Record<stringValuePrompts, CommonPromptOptions> &
    Record<DefaultValueInputPrompts, PromptDefaultValue<string>> &
    Record<promptNames.ui5Version, UI5VersionPromptOptions>;

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
    } & CommonPromptOptions
> &
    Record<DefaultValueConfirmPrompts, PromptDefaultValue<boolean>>;

export type UI5ApplicationPromptOptions = Partial<stringValuePromptOptions & booleanValuePromptOtions>;
