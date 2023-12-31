export type AddonActions = GetProjectPath | SetProjectPath | UpdateProjectPath | UpdateProjectPathResult;

export const GET_PROJECT_PATH = 'GET_PROJECT_PATH';
export const UPDATE_PROJECT_PATH = 'UPDATE_PROJECT_PATH';
export const SET_PROJECT_PATH = 'SET_PROJECT_PATH';
export const UPDATE_PROJECT_PATH_RESULT = 'UPDATE_PROJECT_PATH_RESULT';

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
