import type { IValidationLink, IMessageSeverity } from '@sap-devx/yeoman-ui-types';
import type {
    Answers,
    ConfirmQuestion as BaseConfirmQuestion,
    InputQuestion as BaseInputQuestion,
    ListQuestion as BaseListQuestion,
    CheckboxQuestion as BaseCheckBoxQuestion,
    NumberQuestion as BaseNumberQuestion,
    EditorQuestion as BaseEditorQuestion,
    ListChoiceOptions,
    PromptFunction,
    PromptModule,
    Question,
    Validator,
    AsyncDynamicQuestionProperty
} from 'inquirer';

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
    /**
     * Indicates how the question will be displayed in YUI
     */
    type?: 'label';
    /**
     * Link to be shown in input question prompt of type 'label'
     */
    link?: {
        /**
         * A string that will have the styles of a link and will be concatenated at the end of the question message
         */
        text?: string;
        /**
         * The URL to which the text points
         */
        url?: string;
    };
}

export type PromptSeverityMessage = (
    input?: unknown,
    previousAnswers?: Answers
) => IMessageSeverity | undefined | Promise<IMessageSeverity | undefined>;

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
    additionalMessages?: YUIQuestion['additionalMessages'];
}

export interface ConfirmQuestion<A extends Answers = Answers> extends BaseConfirmQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface EditorQuestion<A extends Answers = Answers> extends BaseEditorQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface InputQuestion<A extends Answers = Answers> extends BaseInputQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}

export interface CheckBoxQuestion<A extends Answers = Answers> extends BaseCheckBoxQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
    additionalMessages?: YUIQuestion['additionalMessages'];
}

export interface NumberQuestion<A extends Answers = Answers> extends BaseNumberQuestion<A> {
    name: YUIQuestion['name'];
    guiOptions?: YUIQuestion['guiOptions'];
}
/**
 * Defines prompt/question default values and/or whether or not they should be shown.
 */
export type CommonPromptOptions<T extends Answers = Answers> = {
    hide?: boolean;
    validate?: Validator<T>;
    additionalMessages?: PromptSeverityMessage;
};

// Default value type for input prompt options
export type PromptDefaultValue<T> = {
    default?: AsyncDynamicQuestionProperty<T>;
};

export type TelemPropertyDestinationType =
    | 'AbapODataCatalogDest'
    | 'GenericODataFullUrlDest'
    | 'GenericODataPartialUrlDest'
    | 'Unknown';

/**
 * Implementation of IValidationLink interface.
 * Provides a toString() for serialization on CLI since IValidationLink rendering is only supported by YeomanUI.
 */
export class ValidationLink implements IValidationLink {
    // Having to redeclare properties from an interface should not be required see: https://github.com/Microsoft/TypeScript/issues/5326
    message: IValidationLink['message'];
    link: IValidationLink['link'];

    /**
     * Constructor for ValidationLink.
     *
     * @param validationLink The validation link object to be used for serialization
     */
    constructor(validationLink: IValidationLink) {
        Object.assign(this, validationLink);
    }

    /**
     * Serialize the validation link object to a string.
     *
     * @returns The validation link object as a string
     */
    public toString(): string {
        return `${this.message} ${this.link.text}${this.link.url ? ' : ' + this.link.url : ''}`;
    }
}
