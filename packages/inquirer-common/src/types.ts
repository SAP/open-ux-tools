import type { IMessageSeverity } from '@sap-devx/yeoman-ui-types';
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

export interface UI5VersionChoice extends ListChoiceOptions {
    value: string; // UI5 semantic version
}

export interface InquirerAdapter {
    prompt: PromptFunction;
    promptModule: PromptModule;
}

/**
 * To be replaced when YUI specific types are available from `"@sap-devx/yeoman-ui-types`
 *
 */
export interface GuiOptions {
    hint?: string;
    mandatory?: boolean;
    applyDefaultWhenDirty?: boolean;
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
