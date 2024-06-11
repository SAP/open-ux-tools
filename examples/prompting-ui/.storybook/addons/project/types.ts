import { Answers } from 'inquirer';
import { SupportedBuildingBlocks } from '../../../stories/utils';
import { IQuestion } from '@sap-ux/ui-prompting';

export type ProjectActions = GetProjectPath | SetProjectPath | UpdateProjectPath | UpdateProjectPathResult;

export const GET_PROJECT_PATH = 'GET_PROJECT_PATH';
export const UPDATE_PROJECT_PATH = 'UPDATE_PROJECT_PATH';
export const SET_PROJECT_PATH = 'SET_PROJECT_PATH';
export const UPDATE_PROJECT_PATH_RESULT = 'UPDATE_PROJECT_PATH_RESULT';
export const VALIDATE_ANSWERS = 'VALIDATE_ANSWERS';

export interface GetProjectPath {
    type: typeof GET_PROJECT_PATH;
}

export interface SetProjectPath {
    type: typeof SET_PROJECT_PATH;
    path: string;
}

export interface UpdateProjectPath {
    type: typeof UPDATE_PROJECT_PATH;
    path: string;
}

export interface UpdateProjectPathResultPayload {
    saved: boolean;
    message?: string;
    path?: string;
}

export interface UpdateProjectPathResult extends UpdateProjectPathResultPayload {
    type: typeof UPDATE_PROJECT_PATH_RESULT;
}

export interface ValidateAnswers {
    type: typeof VALIDATE_ANSWERS;
    questions: IQuestion[];
    answers: Answers;
    value: SupportedBuildingBlocks;
}
