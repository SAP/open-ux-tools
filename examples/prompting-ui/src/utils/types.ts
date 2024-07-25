import {
    type FilterBarPromptsAnswer,
    type ChartPromptsAnswer,
    type TablePromptsAnswer,
    type Prompts
} from '@sap-ux/fe-fpm-writer';
import { PromptsType } from '@sap-ux/fe-fpm-writer/dist/prompts/types';
import type { AddonActions } from '../addons/types';
import type { DynamicChoices } from '@sap-ux/ui-prompting';
import type { Answers, CodeSnippet, SupportedGeneratorAnswers } from '@sap-ux/fe-fpm-writer';

export type Actions =
    | GetQuestions
    | SetTableQuestions
    | SetChartQuestions
    | SetFilterBarQuestions
    | GetChoices
    | SetChoices
    | ApplyAnswers
    | ResetAnswers
    | AddonActions
    | GetCodeSnippet
    | UpdateCodeSnippet
    | SetValidationResults;

export const GET_QUESTIONS = 'GET_QUESTIONS';
export const SET_TABLE_QUESTIONS = 'SET_TABLE_QUESTIONS';
export const SET_CHART_QUESTIONS = 'SET_CHART_QUESTIONS';
export const SET_FILTERBAR_QUESTIONS = 'SET_FILTERBAR_QUESTIONS';
export const GET_CHOICES = 'GET_CHOICES';
export const SET_CHOICES = 'SET_CHOICES';
export const APPLY_ANSWERS = 'APPLY_ANSWERS';
export const RESET_ANSWERS = 'RESET_ANSWERS';
export const SET_VALIDATION_RESULTS = 'SET_VALIDATION_RESULTS';

export { PromptsType };

export interface ApplyAnswers {
    type: typeof APPLY_ANSWERS;
    answers: SupportedGeneratorAnswers;
    buildingBlockType: PromptsType;
}

export interface ResetAnswers {
    type: typeof RESET_ANSWERS;
    buildingBlockType: PromptsType;
}

export interface GetChoices {
    type: typeof GET_CHOICES;
    names: string[];
    answers: Answers;
    buildingBlockType: PromptsType;
}

export interface SetChoices {
    type: typeof SET_CHOICES;
    choices: DynamicChoices;
}
export interface GetQuestions {
    type: typeof GET_QUESTIONS;
    value: PromptsType;
}

export interface SetTableQuestions extends Prompts<TablePromptsAnswer> {
    type: typeof SET_TABLE_QUESTIONS;
}

export interface SetChartQuestions extends Prompts<ChartPromptsAnswer> {
    type: typeof SET_CHART_QUESTIONS;
}

export interface SetFilterBarQuestions extends Prompts<FilterBarPromptsAnswer> {
    type: typeof SET_FILTERBAR_QUESTIONS;
}

export interface SetValidationResults {
    type: typeof SET_VALIDATION_RESULTS;
    validationResults: { [questionName: string]: { isValid: boolean; errorMessage?: string } };
}

// Move to addon?
export const GET_CODE_SNIPPET = 'GET_CODE_SNIPPET';
export const UPDATE_CODE_SNIPPET = 'UPDATE_CODE_SNIPPET';
export interface GetCodeSnippet {
    type: typeof GET_CODE_SNIPPET;
    buildingBlockType: PromptsType;
    answers: SupportedGeneratorAnswers;
}

export interface UpdateCodeSnippetPayload {
    buildingBlockType: PromptsType;
    codeSnippets: { [questionName: string]: CodeSnippet };
    answers: SupportedGeneratorAnswers;
}
export interface UpdateCodeSnippet extends UpdateCodeSnippetPayload {
    type: typeof UPDATE_CODE_SNIPPET;
}
