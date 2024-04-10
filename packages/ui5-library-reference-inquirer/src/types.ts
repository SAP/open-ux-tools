import type { PromptSeverityMessage, validate, YUIQuestion } from '@sap-ux/inquirer-common';

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
    validate?: validate<UI5LibraryReferenceAnswers>;
    additionalMessages?: PromptSeverityMessage;
};

/**
 * Provide the correct type checking for string value prompts and `ui5Version` options
 *
 */
type stringValuePromptOptions = Record<stringValuePrompts, CommonPromptOptions>;

export const enum ReuseLibType {
    Library = 'library',
    Component = 'component'
}

/**
 * Reuse library
 */
export interface ReuseLib {
    name: string;
    path: string;
    type: ReuseLibType;
    uri: string;
    dependencies: string[];
    libRoot: string;
}

/**
 * Choice for the reuse library
 */
export interface ReuseLibChoice {
    name: string;
    value: ReuseLib;
}

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
