import type { FilterBarPromptsAnswer, ChartPromptsAnswer, TablePromptsAnswer } from '@sap-ux/fe-fpm-writer';
import type { Question, Answers } from 'inquirer';

export type Actions =
    | GetQuestions
    | SetTableQuestions
    | SetChartQuestions
    | SetFilterBarQuestions
    | GetChoices
    | SetChoices;

export const GET_QUESTIONS = 'GET_QUESTIONS';
export const SET_TABLE_QUESTIONS = 'SET_TABLE_QUESTIONS';
export const SET_CHART_QUESTIONS = 'SET_CHART_QUESTIONS';
export const SET_FILTERBAR_QUESTIONS = 'SET_FILTERBAR_QUESTIONS';
export const GET_CHOICES = 'GET_CHOICES';
export const SET_CHOICES = 'SET_CHOICES';

/**
 * Building block type.
 *
 * @enum {string}
 */
export const enum SupportedBuildingBlocks {
    FilterBar = 'FilterBar',
    Chart = 'Chart',
    Table = 'Table'
}

export interface GetChoices {
    type: typeof GET_CHOICES;
    name: string;
    answers: any;
    buildingBlockType: SupportedBuildingBlocks;
}

export interface SetChoices {
    type: typeof SET_CHOICES;
    name: string;
    choices: unknown[];
}
export interface GetQuestions {
    type: typeof GET_QUESTIONS;
    value: SupportedBuildingBlocks;
}

interface SetQuestions<T extends Answers> {
    questions: Question<T>[];
}

export type SupportedAnswers = TablePromptsAnswer | ChartPromptsAnswer | FilterBarPromptsAnswer;

export interface SetTableQuestions extends SetQuestions<TablePromptsAnswer> {
    type: typeof SET_TABLE_QUESTIONS;
}

export interface SetChartQuestions extends SetQuestions<ChartPromptsAnswer> {
    type: typeof SET_CHART_QUESTIONS;
}

export interface SetFilterBarQuestions extends SetQuestions<FilterBarPromptsAnswer> {
    type: typeof SET_FILTERBAR_QUESTIONS;
}
