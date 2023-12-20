import type { FilterBarPromptsAnswer, ChartPromptsAnswer, TablePromptsAnswer } from '@sap-ux/fe-fpm-writer';
import type { Question, Answers } from 'inquirer';

export type Actions = GetQuestions | SetTableQuestions | SetChartQuestions | SetFilterBarQuestions;

export const GET_QUESTIONS = 'GET_QUESTIONS';
export const SET_TABLE_QUESTIONS = 'SET_TABLE_QUESTIONS';
export const SET_CHART_QUESTIONS = 'SET_CHART_QUESTIONS';
export const SET_FILTERBAR_QUESTIONS = 'SET_FILTERBAR_QUESTIONS';

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
