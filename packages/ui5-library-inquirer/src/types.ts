import type {
    ConfirmQuestion as BaseConfirmQuestion,
    InputQuestion as BaseInputQuestion,
    ListQuestion as BaseListQuestion,
    Answers,
    ListChoiceOptions,
    PromptFunction,
    PromptModule
} from 'inquirer';

export interface UI5LibraryAnswers {
    libraryName?: string;
    namespace?: string;
    targetFolder?: string;
    ui5Version?: string;
    enableTypescript?: boolean;
}

export interface UI5LibraryPromptOptions {
    /**
     * Optionally provide the target folder used as the `targetFolder` prompt default value
     */
    targetFolder?: string;
    /**
     * Optionally include an Inquirer Separator for grouped UI5 versions
     */
    includeSeparators?: boolean;
    /**
     * Optionally register the `inquirer-autocomplete-prompt` plugin and use for UI5 version searching
     */
    useAutocomplete?: boolean;
}

export interface UI5VersionChoice extends ListChoiceOptions {
    value: string; // UI5 semantic version
}

export interface InquirerAdaptor {
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
export interface ConfirmQuestion<A extends Answers = Answers> extends BaseConfirmQuestion<A> {
    guiOptions?: GuiOptions;
}

export interface InputQuestion<A extends Answers = Answers> extends BaseInputQuestion<A> {
    guiOptions?: GuiOptions;
}

export interface ListQuestion<A extends Answers = Answers> extends BaseListQuestion<A> {
    guiOptions?: GuiOptions;
}

export interface FileBrowserQuestion<A extends Answers = Answers> extends InputQuestion<A> {
    guiType: 'file-browser' | 'folder-browser';
}
