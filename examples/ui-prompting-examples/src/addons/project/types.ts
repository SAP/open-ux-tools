import type { Answers } from 'inquirer';
import type { PromptsType } from '../../utils';
import type { PromptQuestion } from '@sap-ux/ui-prompting';

export type ProjectActions =
    | GetProjectPath
    | SetProjectPath
    | UpdateProjectPath
    | UpdateProjectPathResult
    | ValidateAnswers;

export const GET_PROJECT_PATH = 'GET_PROJECT_PATH';
export const UPDATE_PROJECT_PATH = 'UPDATE_PROJECT_PATH';
export const SET_PROJECT_PATH = 'SET_PROJECT_PATH';
export const UPDATE_PROJECT_PATH_RESULT = 'UPDATE_PROJECT_PATH_RESULT';
export const VALIDATE_ANSWERS = 'VALIDATE_ANSWERS';

export interface ApplicationInformation {
    projectPath?: string;
    appId?: string;
}

export interface GetProjectPath {
    type: typeof GET_PROJECT_PATH;
}

export interface SetProjectPath {
    type: typeof SET_PROJECT_PATH;
    application: ApplicationInformation | undefined;
}

export interface UpdateProjectPath {
    type: typeof UPDATE_PROJECT_PATH;
    application: ApplicationInformation | undefined;
}

export interface UpdateProjectPathResultPayload {
    saved: boolean;
    message?: string;
    application?: ApplicationInformation;
}

export interface UpdateProjectPathResult extends UpdateProjectPathResultPayload {
    type: typeof UPDATE_PROJECT_PATH_RESULT;
}

export interface ValidateAnswers {
    type: typeof VALIDATE_ANSWERS;
    questions: PromptQuestion[];
    answers: Answers;
    value: PromptsType;
}
