import { type CdsUi5PluginInfo } from '@sap-ux/cap-config-writer';
import type { CapProjectType } from '@sap-ux/project-access';
import type {
    Answers,
    ConfirmQuestion as BaseConfirmQuestion,
    ListQuestion as BaseListQuestion,
    InputQuestion as BaseInputQuestion,
    ListChoiceOptions,
    PromptFunction,
    PromptModule,
    Question,
    AsyncDynamicQuestionProperty
} from 'inquirer';
import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';

// todo: move to YUI types
export interface GuiOptions {
    hint?: string;
    mandatory?: boolean;
    applyDefaultWhenDirty?: boolean;
    breadcrumb?: boolean | string;
}

export type PromptSeverityMessage = (input?: unknown, previousAnswers?: Answers) => IMessageSeverity | undefined;
export type validate<T> = (input: any, answers?: T) => boolean | string | Promise<boolean | string>;

export type UI5ApplicationQuestion<A extends Answers = Answers> = Question<A> & {
    name: string;
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
};

export interface FileBrowserQuestion<A extends Answers = Answers> extends BaseInputQuestion<A> {
    name: UI5ApplicationQuestion['name'];
    guiType: 'file-browser' | 'folder-browser';
    guiOptions?: UI5ApplicationQuestion['guiOptions'];
}

export interface ListQuestion<A extends Answers = Answers> extends BaseListQuestion<A> {
    name: UI5ApplicationQuestion['name'];
    guiOptions?: UI5ApplicationQuestion['guiOptions'];
}

export interface ConfirmQuestion<A extends Answers = Answers> extends BaseConfirmQuestion<A> {
    name: UI5ApplicationQuestion['name'];
    guiOptions?: UI5ApplicationQuestion['guiOptions'];
}

export interface InputQuestion<A extends Answers = Answers> extends BaseInputQuestion<A> {
    name: UI5ApplicationQuestion['name'];
    guiOptions?: UI5ApplicationQuestion['guiOptions'];
}

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
 * All info relevant to prompting for CAP projects
 *
 */
export type CapCdsInfo = Partial<CdsUi5PluginInfo> & {
    capProjectType?: CapProjectType;
};

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
     * todo: example
     */
    minUI5Version: string;
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

export interface UI5VersionChoice extends ListChoiceOptions {
    value: string; // UI5 semantic version
}

export interface InquirerAdapter {
    prompt: PromptFunction;
    promptModule: PromptModule;
}

/**
 *
 * Remove when YUI specific types are available from `"@sap-devx/yeoman-ui-types`
 *
 */
export interface GuiOptions {
    hint?: string;
    applyDefaultWhenDirty?: boolean;
    breadcrumb?: boolean | string;
}
