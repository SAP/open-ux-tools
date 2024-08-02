import { PromptsAPI } from '@sap-ux/fe-fpm-writer';
import { join } from 'path';
import type { Editor } from 'mem-fs-editor';
import { PromptsType } from '../utils';
import type { ApplicationInformation } from '../addons/project';

const api: { [key: string]: PromptsAPI } = {};

/**
 * Method returns intstance of prompt api for passed project path and appId.
 *
 * @param projectPath Path to project
 * @param fs the file system object for reading files
 * @param appId app id in CAP project
 * @returns instance of prompt api.
 */
export const getPromptApi = async (
    projectPath: string | undefined,
    fs: Editor,
    appId?: string
): Promise<PromptsAPI> => {
    const key = projectPath ? join(projectPath, appId ?? '') : '';
    if (api[key]) {
        return api[key];
    }
    const promptsAPI = await PromptsAPI.init(projectPath ?? '', appId, fs);
    // Cache entry
    api[key] = promptsAPI;
    return promptsAPI;
};

/**
 * Method validates current saved/stored project path.
 *
 * @param application Application to validate
 * @returns "undefined" if project path is valid or error message if project path is invalid.
 */
export const validateProject = async (application: ApplicationInformation): Promise<string | undefined> => {
    try {
        const { projectPath, appId } = application;
        const promptsAPI = await PromptsAPI.init(projectPath ?? '', appId);
        // Call API to get table questions - it should validate of path is supported
        const { questions } = await promptsAPI.getPrompts(PromptsType.Table);
        const entityQuestion = questions.find((question) => question.name === 'entity');
        if (entityQuestion && 'choices' in entityQuestion && typeof entityQuestion.choices === 'function') {
            await entityQuestion.choices({});
        }
    } catch (e) {
        return `Error: ${e.message || e}`;
    }
};
