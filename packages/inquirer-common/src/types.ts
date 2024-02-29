import { type IMessageSeverity, Severity } from '@sap-devx/yeoman-ui-types';
import type {
    Answers,
    ConfirmQuestion as BaseConfirmQuestion,
    InputQuestion as BaseInputQuestion,
    ListQuestion as BaseListQuestion,
    ListChoiceOptions,
    PromptFunction,
    PromptModule,
    Question
} from 'inquirer';

// Re-export for convienient import in consuming modules
export { type IMessageSeverity, Severity };

export interface UI5VersionChoice extends ListChoiceOptions {
    /**
     * UI5 semantic version
     */
    value: string;
}

export interface InquirerAdapter {
    /**
     * The prompt function
     */
    prompt: PromptFunction;
    /**
     * Plugins will be registered on this prompt module if required
     */
    promptModule?: PromptModule;
}

/**
 * To be replaced when YUI specific types are available from `"@sap-devx/yeoman-ui-types`.
 *
 */
export interface GuiOptions {
    /**
     * Provides a tooltip with a YUI prompt
     */
    hint?: string;
    /**
     * A valid prompt answer is mandatory to progress with prompting
     */
    mandatory?: boolean;
    /**
     * Defaults will be re-applied if a previous answer has changed
     */
    applyDefaultWhenDirty?: boolean;
    /**
     * Indicate state in the left hand navigation panel in YUI
     */
    breadcrumb?: boolean | string;
}

export type PromptSeverityMessage = (input?: unknown, previousAnswers?: Answers) => IMessageSeverity | undefined;
export type validate<T> = (input: any, answers?: T) => boolean | string | Promise<boolean | string>;

export type YUIQuestion<A extends Answers = Answers> = Question<A> & {
    name: string;
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
};

export interface FileBrowserQuestion<A extends Answers = Answers> extends BaseInputQuestion<A> {
    name: YUIQuestion['name'];
    guiType: 'file-browser' | 'folder-browser';
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface ListQuestion<A extends Answers = Answers> extends BaseListQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface ConfirmQuestion<A extends Answers = Answers> extends BaseConfirmQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface InputQuestion<A extends Answers = Answers> extends BaseInputQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}
