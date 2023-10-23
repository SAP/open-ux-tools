/**
 *
 * Remove when YUI specific types are available from `"@sap-devx/yeoman-ui-types`
 *
 */
import type {
    ConfirmQuestion as BaseConfirmQuestion,
    InputQuestion as BaseInputQuestion,
    ListQuestion as BaseListQuestion,
    PasswordQuestion as BasePasswordQuestion,
    CheckboxQuestion as BaseCheckboxQuestion,
    Answers,
    ChoiceOptions
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
