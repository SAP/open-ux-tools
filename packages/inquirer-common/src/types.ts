import type { IValidationLink, IMessageSeverity, ShowOutputTabLink } from '@sap-devx/yeoman-ui-types';
import type { Answers, DistinctQuestion, Question } from 'inquirer';

export type { Answers, Question };

/**
 * A single prompt choice. Mirrors the fields of the former `inquirer@8` `ListChoiceOptions`
 * that this library relies on. Defined locally to decouple from inquirer internals, which moved
 * the choice shape into the per-prompt `@inquirer/*` packages in inquirer 13.
 */
export interface ChoiceOptions<T = unknown> {
    /**
     * The choice label shown to the user
     */
    name?: string;
    /**
     * The value returned when the choice is selected
     */
    value?: T;
    /**
     * A short label shown after selection
     */
    short?: string;
    /**
     * Whether the choice is selectable, optionally with a reason string
     */
    disabled?: boolean | string;
}

export interface UI5VersionChoice extends ChoiceOptions<string> {
    /**
     * UI5 semantic version
     */
    value: string;
}

/**
 * Validate function signature for a prompt. Mirrors the inline `validate` signature used by
 * inquirer 13 questions (inquirer 8's standalone `Validator` type was removed). The return type is
 * kept to the inquirer/yeoman primitive `boolean | string` so that {@link YUIQuestion} stays
 * assignable to `yeoman-generator`'s `this.prompt(...)` without casting. Validators that produce a
 * rich {@link ValidationLink} rely on its `toString()` for CLI serialization (YeomanUI renders the
 * link itself); see {@link ValidationLink}.
 */
export type Validator<T extends Answers = Answers> = (
    input: unknown,
    answers?: Partial<T>
) => boolean | string | Promise<boolean | string>;

/**
 * The prompt function accepted by {@link InquirerAdapter}. Matches the callable signature of the
 * prompt module returned by inquirer's `createPromptModule`.
 */
export type PromptFunction = <T extends Answers = Answers>(questions: YUIQuestion<T>[] | YUIQuestion<T>) => Promise<T>;

/**
 * A prompt module on which additional prompt plugins may be registered.
 */
export interface PromptModule {
    registerPrompt: (name: string, prompt: unknown) => void;
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
 * To be replaced when YUI specific types are available from `@sap-devx/yeoman-ui-types`.
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
    type?: 'label' | 'login' | 'folder-browser';
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

/**
 * YUI-specific extensions added to every question type.
 */
interface YUIQuestionExtensions {
    guiOptions?: GuiOptions;
    additionalMessages?: PromptSeverityMessage;
    showOutputTabLink?: ShowOutputTabLink;
}

/**
 * Replaces the inquirer arm's `validate` with the YUI form: it accepts the current answers and
 * allows a rich {@link ValidationLink} result. inquirer 13 narrows some arms (e.g. password) to a
 * single `(value)` argument and does not permit a non-primitive result, so the arm's `validate`
 * is omitted and re-declared here.
 */
interface YUIValidate<A extends Answers> {
    validate?: Validator<A>;
}

/**
 * Whether the answer should be persisted by the prompt UI. Modelled on the specific question
 * types that use it since inquirer 13's closed arms reject it as an excess property.
 */
interface StoreOption {
    store?: boolean;
}

/**
 * Distributes {@link Omit} over a union so each member keeps its own keys. The built-in `Omit`
 * reduces a union to a single object type (it operates on the shared `keyof`), which collapses
 * inquirer 13's `DistinctQuestion` arm union and drops arm-specific required keys (e.g. the
 * `search` arm's `source`). Distributing preserves every arm, keeping {@link YUIQuestion}
 * assignable to `yeoman-generator`'s per-arm `PromptQuestion` union.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Base question type carrying the YUI-specific extensions. Assignable to inquirer's
 * `DistinctQuestion`, which is the per-question type accepted by `yeoman-generator`'s
 * `this.prompt(...)` (via `@yeoman/types` -> `@yeoman/adapter`). This assignability is what
 * allows questions produced by this library to be passed to a generator without casting.
 *
 * `name` is intentionally not re-declared here: inquirer 13 already types it as
 * `Extract<keyof A, string>` on `DistinctQuestion` (which is `string` for the default
 * `Answers`). Overriding it to a bare `string` would widen it back and break assignability
 * for questions typed against a concrete answers shape.
 *
 * `validate` is re-declared via {@link YUIValidate} so the base agrees with the specific question
 * types: YUI validators receive the answers (the `boolean | string` return keeps the question
 * assignable to `this.prompt`).
 */
export type YUIQuestion<A extends Answers = Answers> = DistributiveOmit<DistinctQuestion<A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A>;

/**
 * Extracts the inquirer question arm for a given prompt `type` discriminant.
 */
type QuestionArm<T extends string, A extends Answers> = Extract<DistinctQuestion<A>, { type?: T }>;

export type PasswordQuestion<A extends Answers = Answers> = Omit<QuestionArm<'password', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    StoreOption & {
        /**
         * Renders the password prompt as a masked login input in YUI.
         */
        guiType?: 'login';
    };

export interface FileBrowserQuestion<A extends Answers = Answers>
    extends Omit<QuestionArm<'input', A>, 'type' | 'validate'>, YUIQuestionExtensions, YUIValidate<A> {
    type?: 'input';
    guiType: 'file-browser' | 'folder-browser';
}
// The list prompt was renamed to `select` in inquirer 13; `ListQuestion` maps to that arm.
export type ListQuestion<A extends Answers = Answers> = Omit<QuestionArm<'select', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    StoreOption;

export type ConfirmQuestion<A extends Answers = Answers> = Omit<QuestionArm<'confirm', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A>;

export type EditorQuestion<A extends Answers = Answers> = Omit<QuestionArm<'editor', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    StoreOption;

export type InputQuestion<A extends Answers = Answers> = Omit<QuestionArm<'input', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    StoreOption;

export type CheckBoxQuestion<A extends Answers = Answers> = Omit<QuestionArm<'checkbox', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A>;

export type NumberQuestion<A extends Answers = Answers> = Omit<QuestionArm<'number', A>, 'validate'> &
    YUIQuestionExtensions &
    YUIValidate<A>;
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
    default?: T | ((answers: Answers) => T | Promise<T>);
};

export type TelemPropertyDestinationType =
    'AbapODataCatalogDest' | 'GenericODataFullUrlDest' | 'GenericODataPartialUrlDest' | 'Unknown';

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
