import type { IValidationLink, IMessageSeverity, ShowOutputTabLink } from '@sap-devx/yeoman-ui-types';
import type { Answers, DistinctQuestion } from 'inquirer';

export type { Answers };
export type { Question } from 'inquirer';

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

/**
 * A checkbox prompt choice. Extends {@link ChoiceOptions} with the checkbox-only
 * `checked` flag. Mirrors the field of the former inquirer@8 checkbox choice shape,
 * which inquirer 13 moved into the per-prompt `@inquirer/checkbox` package.
 */
export interface CheckboxChoiceOptions<T = unknown> extends ChoiceOptions<T> {
    /** Whether the choice is pre-selected */
    checked?: boolean;
}

export interface UI5VersionChoice extends ChoiceOptions<string> {
    /**
     * UI5 semantic version
     */
    value: string;
}

/**
 * Validate function signature for a prompt. Mirrors inquirer 13's own inline `validate` signature,
 * whose `value` parameter is `any` (inquirer 8's standalone `Validator` type was removed). Using
 * `any` — rather than a stricter `unknown` — lets consumers keep concretely-typed validators (e.g.
 * `(value: string) => ...`) without widening-and-casting at every call site. The return type is
 * kept to the inquirer/yeoman primitive `boolean | string` so that {@link YUIQuestion} stays
 * assignable to `yeoman-generator`'s `this.prompt(...)` without casting. Validators that produce a
 * rich {@link ValidationLink} rely on its `toString()` for CLI serialization (YeomanUI renders the
 * link itself); see {@link ValidationLink}.
 */
export type Validator<T extends Answers = Answers> = (
    input: any,
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
 * Replaces the inquirer arm's `when` with the YUI form, whose callback receives the full answers
 * type `A`. inquirer 13 types the callback argument as `Partial<A>` (answers are incomplete while
 * prompting), so a callback written against the concrete `A` is not assignable to the arm's `when`
 * (the parameter is contravariant). The YUI call sites pass concretely-typed `(answers: A)` guards,
 * so — mirroring {@link YUIValidate} — the arm's `when` is omitted and re-declared here to accept
 * them without a cast.
 */
interface YUIWhen<A extends Answers> {
    when?: boolean | ((answers: A) => boolean | Promise<boolean>);
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
 * Minimal base interface for all question-like objects in this library. It carries only the
 * fields that helper functions in `prompts/helpers.ts` actually read or write: `name`, `validate`,
 * `when`, `additionalMessages`, `guiOptions`, `showOutputTabLink`, and `default`.
 *
 * Using this as the constraint for helper function generics (`T extends YUIQuestionBase<A>`)
 * avoids `any`. CLI-only non-rendering hooks (objects with `name` and `when` but no `type` or
 * `message`) satisfy this interface directly; packages push them alongside {@link YUIQuestion}
 * by widening their question arrays to `YUIQuestionBase<A>[]`.
 */
export interface YUIQuestionBase<A extends Answers = Answers>
    extends YUIQuestionExtensions, YUIValidate<A>, YUIWhen<A> {
    name: string;
    default?: unknown;
}

/**
 * Base question type carrying the YUI-specific extensions. Assignable to inquirer's
 * `DistinctQuestion`, which is the per-question type accepted by `yeoman-generator`'s
 * `this.prompt(...)` (via `@yeoman/types` -> `@yeoman/adapter`). This assignability is what
 * allows questions produced by this library to be passed to a generator without casting.
 *
 * `name` is intentionally not re-declared on the arm branch: inquirer 13 already types it as
 * `Extract<keyof A, string>` on `DistinctQuestion` (which is `string` for the default
 * `Answers`). Overriding it to a bare `string` would widen it back and break assignability
 * for questions typed against a concrete answers shape.
 *
 * `validate` is re-declared via {@link YUIValidate} so the base agrees with the specific question
 * types: YUI validators receive the answers (the `boolean | string` return keeps the question
 * assignable to `this.prompt`).
 *
 * The {@link FileBrowserQuestion} member admits the YUI file/folder-browser input, whose `guiType`
 * is an excess property inquirer 13's `input` arm would otherwise reject.
 *
 * The {@link ListQuestion} member admits list prompts, which emit `type: 'list'` (the inquirer 8
 * spelling the YUI renderer expects) rather than inquirer 13's `select` discriminant, so they are
 * not assignable to the `DistinctQuestion`-derived member above.
 *
 * CLI-only typeless hooks are not part of this union. They satisfy {@link YUIQuestionBase} directly;
 * packages that push them widen their question arrays to `YUIQuestionBase<A>[]`.
 */
export type YUIQuestion<A extends Answers = Answers> =
    | (DistributiveOmit<DistinctQuestion<A>, 'validate' | 'when' | 'name'> &
          YUIQuestionExtensions &
          YUIValidate<A> &
          YUIWhen<A> &
          StoreOption & { name: string })
    | ListQuestion<A>
    | FileBrowserQuestion<A>;

/**
 * Extracts the inquirer question arm for a given prompt `type` discriminant.
 */
type QuestionArm<T extends string, A extends Answers> = Extract<DistinctQuestion<A>, { type?: T }>;

/**
 * Safe version of {@link Omit} that falls back to `Record<string, unknown>` when `T` resolves to
 * `never`. `Omit<never, K>` produces `{ [key: string]: never }` in TypeScript 5+, which makes all
 * intersected properties resolve to `never`. The fallback carries an open index signature so
 * consuming types retain their explicit properties without being poisoned.
 */
type SafeOmit<T, K extends PropertyKey> = [T] extends [never] ? Record<string, unknown> : Omit<T, K>;

export type PasswordQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'password', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A> &
    StoreOption & {
        /**
         * Renders the password prompt as a masked login input in YUI.
         */
        guiType?: 'login';
    };

export type FileBrowserQuestion<A extends Answers = Answers> = SafeOmit<
    QuestionArm<'input', A>,
    'type' | 'validate' | 'when'
> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A> & {
        type: 'input';
        guiType: 'file-browser' | 'folder-browser';
    };
// inquirer 13 renamed the `list` prompt to `select`; `ListQuestion` reuses that arm's config but
// emits `type: 'list'`. YUI/App Wizard renders `list`, and @yeoman/adapter aliases `list`→`select`
// at runtime, so the object keeps the inquirer 8 spelling while being typed against inquirer 13.
export type ListQuestion<A extends Answers = Answers> = SafeOmit<
    QuestionArm<'select', A>,
    'validate' | 'when' | 'type' | 'name'
> & {
    type: 'list';
    name: string;
} & YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A> &
    StoreOption;

// inquirer 13's `search` arm replaces the former `inquirer-autocomplete-prompt` plugin. It carries a
// `source` callback instead of static `choices`; the two cannot coexist on one object.
export type SearchQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'search', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A> &
    StoreOption;

export type ConfirmQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'confirm', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A>;

export type EditorQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'editor', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A> &
    StoreOption;

export type InputQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'input', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A> &
    StoreOption;

export type CheckBoxQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'checkbox', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A>;

export type NumberQuestion<A extends Answers = Answers> = SafeOmit<QuestionArm<'number', A>, 'validate' | 'when'> &
    YUIQuestionExtensions &
    YUIValidate<A> &
    YUIWhen<A>;
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
