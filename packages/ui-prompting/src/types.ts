import type { Answers, DistinctChoice } from 'inquirer';
import type {
    CheckBoxQuestion,
    InputQuestion,
    ListQuestion,
    GuiOptions as BaseGuiOptions
} from '@sap-ux/inquirer-common';
import type { I18nBundle, TranslationEntry } from '@sap-ux/ui-components';
import type { SapTextType } from '@sap-ux/i18n';

export { Answers };

/**
 * Extended GUI interface for question.
 */
export interface GuiOptions extends BaseGuiOptions {
    /**
     * Group id for group visualisation.
     */
    groupId?: string;
    /**
     * Placeholder text.
     */
    placeholder?: string;
}

/**
 * Extended GUI interface for base list question - list and checkbox/multiselect.
 */
export interface BaseListGuiOptions extends GuiOptions {
    /**
     * Option population type.
     * 'static' - options are provided within property 'choices'.
     * 'dynamic' - options are provided dynamicly by request.
     * Default value is "static".
     */
    selectType?: 'static' | 'dynamic';
}

/**
 * Extended GUI interface for list question.
 */
export interface ListGuiOptions extends BaseListGuiOptions {
    /**
     * Dependant prompt names which should be updated after value change of current prompt.
     */
    dependantPromptNames?: string[];
    /**
     * Properties of input field for creation mode.
     */
    creation?: ListPromptQuestionCreationProps;
}

/**
 * Interface to enable creation within list/combobox component.
 */
export interface ListPromptQuestionCreationProps {
    /**
     * Placeholder text for creation mode.
     */
    placeholder?: string;
}

/**
 * Translation properties for translatable entry.
 */
export interface TranslationProperties {
    /**
     * Text types for translatable entry.
     */
    type: SapTextType;

    /**
     * Description of the annotation for a new entry in the translation file.
     */
    annotation?: string;
}

/**
 * Extended GUI interface for list question.
 */
export interface InputGuiOptions extends GuiOptions {
    /**
     * Translation properties for translatable input. If this is defined, the input is considered translatable.
     */
    translationProperties?: TranslationProperties;
}

/**
 * Represents a question prompt for list question with dropdown visualization.
 * Combines properties of ListQuestion and BasePromptQuestion.
 */
export interface ListPromptQuestion<T extends Answers = Answers> extends ListQuestion<T> {
    /**
     * Additional properties for ui.
     */
    guiOptions?: ListGuiOptions;
}

/**
 * Represents a question prompt for input with simple input visualization.
 * Combines properties of ListQuestion and BasePromptQuestion.
 */
export interface InputPromptQuestion<T extends Answers = Answers> extends InputQuestion<T> {
    /**
     * Additional properties for ui.
     */
    guiOptions?: InputGuiOptions;
}

/**
 * Represents a question prompt for checkbox.
 * Combines properties of CheckboxQuestion and BasePromptQuestion.
 */
export interface CheckboxPromptQuestion<T extends Answers = Answers> extends CheckBoxQuestion<T> {
    /**
     * Additional properties for ui.
     */
    guiOptions?: BaseListGuiOptions;
}

export type PromptQuestion<T extends Answers = Answers> =
    | ListPromptQuestion<T>
    | InputPromptQuestion<T>
    | CheckboxPromptQuestion<T>;

export interface ValidationResult {
    isValid: boolean;
    errorMessage?: string;
}

export interface ValidationResults {
    [questionName: string]: ValidationResult;
}

export type PromptListChoices = ReadonlyArray<DistinctChoice>;

export interface DynamicChoices {
    [key: string]: PromptListChoices;
}

/**
 * Interfaces for groups.
 */
export interface PromptsGroup {
    /**
     * Unique id of group, which can be used to map with questions
     */
    id: string;
    /**
     * Title of group
     */
    title: string;
    /**
     * Description texts
     */
    description: string[];
}

export type AnswerValue = string | number | boolean | undefined;

export const enum PromptsLayoutType {
    SingleColumn = 'SingleColumn',
    MultiColumn = 'MultiColumn'
}

export const TRANSLATE_EVENT_UPDATE = 'update';
export const TRANSLATE_EVENT_SHOW = 'show';
export interface TranlateUpdateEvent<T extends TranslationEntry> {
    name: typeof TRANSLATE_EVENT_UPDATE;
    entry: T;
}
export interface TranlateShowEvent<T extends TranslationEntry> {
    name: typeof TRANSLATE_EVENT_SHOW;
    entry: T;
}

export type TranslateEvent<T extends TranslationEntry> = TranlateUpdateEvent<T> | TranlateShowEvent<T>;

export interface TranslationProps<T extends TranslationEntry = TranslationEntry> {
    bundle: I18nBundle<T>;
    onEvent?: (question: string, event: TranslateEvent<T>) => void;
    /**
     * Array of pending question.
     */
    pendingQuestions?: string[];
}
