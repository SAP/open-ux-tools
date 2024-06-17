import type { Answers, CheckboxQuestion, ChoiceOptions, DistinctChoice, InputQuestion, ListQuestion } from 'inquirer';

/**
 * Interfaces for questions.
 */
export interface BasePromptQuestion {
    /**
     * Indication wether value is required.
     */
    required?: boolean;
    /**
     * Group id for group visualisation.
     */
    groupId?: string;
    /**
     * Additional prompt/field description.
     */
    additionalInfo?: string;
    // ToDo recheck if it is common property
    placeholder?: string;
}

export interface ListBasePromptQuestion extends BasePromptQuestion {
    /**
     * Option population type.
     * 'static' - options are provided within property 'choices'.
     * 'dynamic' - options are provided dynamicly by request.
     * Default value is "static".
     */
    selectType?: 'static' | 'dynamic';
}

/**
 * Represents a question prompt for list question with dropdown visualization.
 * Combines properties of ListQuestion and BasePromptQuestion.
 */
export interface ListPromptQuestion<T extends Answers = Answers> extends ListQuestion<T>, ListBasePromptQuestion {
    /**
     * Dependant prompt names which should be updated after value change of current prompt.
     */
    dependantPromptNames?: string[];
}

/**
 * Represents a question prompt for input with simple input visualization.
 * Combines properties of ListQuestion and BasePromptQuestion.
 */
export interface InputPromptQuestion<T extends Answers = Answers> extends InputQuestion<T>, BasePromptQuestion {}

/**
 * Represents a question prompt for checkbox.
 * Combines properties of CheckboxQuestion and BasePromptQuestion.
 */
export interface CheckboxPromptQuestion<T extends Answers = Answers>
    extends CheckboxQuestion<T>,
        ListBasePromptQuestion {}

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

/**
 * Choices.
 */
export { DistinctChoice, ChoiceOptions };

// ToDo - change and consume DistinctChoice instead of ChoiceOptions
export type PromptListChoices = ReadonlyArray<ChoiceOptions>;

export interface DynamicChoices {
    [key: string]: PromptListChoices;
}

/**
 * Interfaces for groups.
 */
export interface PromptsGroup {
    // ToDo annotate properties(comments are missing)
    id: string;
    title: string;
    description: string[];
}

// ToDo -recheck type
export type AnswerValue = string | number | boolean | undefined;

export const enum PromptsLayoutType {
    SingleColumn = 'SingleColumn',
    MultiColumn = 'MultiColumn'
}
