import type { PromptSeverityMessage, YUIQuestion } from '@sap-ux/inquirer-common';
import type { ReuseLib } from '@sap-ux/project-access';
import type { ListChoiceOptions, Validator } from 'inquirer';
/**
 * Enumeration of prompt names used by UI5LibraryReferencePromptOptions
 *
 */
export enum promptNames {
    /**
     * Target project folder
     */
    targetProjectFolder = 'targetProjectFolder',
    /**
     * Source of reuse libraries
     */
    source = 'source',
    /**
     * Libraries to reference
     */
    referenceLibraries = 'referenceLibraries'
}

// Creates a general type for all string value prompt options
type stringValuePromptType = typeof promptNames;
type stringValuePrompts = stringValuePromptType[keyof stringValuePromptType];

/**
 * Defines prompt/question default values and/or whether or not they should be shown.
 */
export type CommonPromptOptions = {
    hide?: boolean;
    validate?: Validator<UI5LibraryReferenceAnswers>;
    additionalMessages?: PromptSeverityMessage;
};

/**
 * Provide the correct type checking for string value prompts and `ui5Version` options
 *
 */
type stringValuePromptOptions = Record<stringValuePrompts, CommonPromptOptions>;

/**
 * Answers for the UI5 Library Reference
 */
export interface UI5LibraryReferenceAnswers {
    targetProjectFolder?: string;
    source?: string;
    referenceLibraries?: ReuseLib[];
}

export type UI5LibraryReferenceQuestion = YUIQuestion<UI5LibraryReferenceAnswers>;

export type UI5LibraryReferencePromptOptions = Partial<stringValuePromptOptions>;

/**
 * Choice for the reuse library
 */
export interface ReuseLibChoice extends ListChoiceOptions {
    name: string;
    value: ReuseLib;
}
