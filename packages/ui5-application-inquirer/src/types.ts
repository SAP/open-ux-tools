import type {
    ConfirmQuestion as BaseConfirmQuestion,
    InputQuestion as BaseInputQuestion,
    ListQuestion as BaseListQuestion,
    Answers,
    ListChoiceOptions,
    PromptFunction,
    PromptModule,
    Question,
    InputQuestion
} from 'inquirer';
import { getPrompts } from '.';

// todo: move to YUI types
export interface GuiOptions {
    hint?: string;
    mandatory?: boolean;
    applyDefaultWhenDirty?: boolean;
    breadcrumb?: boolean | string;
}

export type YUIQuestion<A extends Answers = Answers> = Question<A> & {
    guiOptions?: GuiOptions;
}

export interface FileBrowserQuestion<A extends Answers = Answers> extends InputQuestion<A> {
    guiType: 'file-browser' | 'folder-browser';
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface ListQuestion<A extends Answers = Answers> extends BaseListQuestion<A> {
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface ConfirmQuestion<A extends Answers = Answers> extends BaseConfirmQuestion<A> {
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface UI5ApplicationAnswers {
    name?: string;
    title?: string;
    namespace?: string;
    description?: string;
    targetFolder?: string;
    ui5Version?: string;
    ui5Theme?: string;
    enableTypescript?: boolean;
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
    /* enableCodeAssist = 'enableCodeAssist',
    enableNPMWorkspaces = 'enableNPMWorkspaces',
    skipAnnotations = 'skipAnnotations',
    enableTypeScript = 'enableTypeScript' */
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
};

// Creates a general type for all string value prompts
type stringValuePromptType = Omit<
    typeof promptNames,
    'addDeployConfig' | 'addFlpConfig' /* | 'enableEslint' | 'skipAnnotations' | 'enableTypeScript' */
>;
type stringValuePrompts = stringValuePromptType[keyof stringValuePromptType];

// Creates a general type for all boolean value prompts
type booleanValuePromptType = Pick<
    typeof promptNames,
    'addDeployConfig' | 'addFlpConfig' /* | 'enableEslint' | 'skipAnnotations' | 'enableTypeScript' */
>;
type booleanValuePrompts = booleanValuePromptType[keyof booleanValuePromptType];
/**
 * Defines prompt/question default values and/or whether or not they should be shown.
 */
type commonPromptSettings = {
    hide?: boolean;
};

type stringValuePromptOptions =
    | Record<
          stringValuePrompts,
          {
              value?: string;
          } & commonPromptSettings
      > &
          Record<promptNames.ui5Version, UI5VersionPromptOptions>;

type booleanValuePromptOtions = Record<
    booleanValuePrompts,
    {
        value?: boolean;
        /**
         * Callback function can be provided which will be executed on input validation.
         * This may be used to trigger conditional steps in Yeoman UI.
         *
         * @param answer
         * @param promptName
         * @returns
         */
        validatorCallback?: (answer: boolean | string, promptName: string) => void;
    } & commonPromptSettings
>;

export type UI5ApplicationPromptOptions = Partial<stringValuePromptOptions & booleanValuePromptOtions>;

// {
//
//     /**
//      * Optionally register the `inquirer-autocomplete-prompt` plugin and use for UI5 version searching
//      */
//     useAutocomplete?: boolean;
// }

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

