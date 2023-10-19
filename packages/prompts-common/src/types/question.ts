/**
 *
 * Move YUI specific types to YUI
 *
 */
import type { UI5Version } from '@sap-ux/ui5-info';
import type {
    ConfirmQuestion as BaseConfirmQuestion,
    InputQuestion as BaseInputQuestion,
    ListQuestion as BaseListQuestion,
    PasswordQuestion as BasePasswordQuestion,
    CheckboxQuestion as BaseCheckboxQuestion,
    Answers,
    ChoiceOptions,
    Question,
    ListChoiceOptions
} from 'inquirer';

export interface GuiOptions {
    hint?: string;
    applyDefaultWhenDirty?: boolean;
    breadcrumb?: boolean | string;
}

export interface PasswordQuestion<A extends Answers = Answers> extends BasePasswordQuestion<A> {
    guiOptions?: GuiOptions;
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

export interface TileChoiceOptions extends ChoiceOptions {
    description?: string;
    image?: string;
    homepage?: string;
}

export interface TileSelectQuestion<T extends Answers = Answers> extends ListQuestion<T> {
    guiType: 'tiles';
    choices: TileChoiceOptions[];
}

export interface CheckboxQuestion<A extends Answers = Answers> extends BaseCheckboxQuestion<A> {
    guiOptions?: GuiOptions;
}

export interface AutocompleteQuestion extends Question {
    type: 'autocomplete' | any;
    source: (previousAnswers: Answers, input: string) => Promise<string[]>;
    suggestOnly?: boolean; // When false input cannot be used to provide an answer, which must be selected. This only applies to CLI use.
    /**
     * Additional messages can be shown based on auto-complete search results
     */
    additionalInfo: () => string;
}

/**
 * Extends Inquirer ListChoiceOptions
 *
 */
export interface UI5VersionChoice extends ListChoiceOptions {
    version: UI5Version;
}
