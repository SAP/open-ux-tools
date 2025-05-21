import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { Choice, PromptObject } from 'prompts';
import type { Manifest } from '@sap-ux/project-access';
import { getODataSources, getMainServiceDataSource } from '../app-info';
import { t } from '..';

/**
 * Return the list of questions to configure mockserver.
 *
 * @param params - optional parameters used to fill default values
 * @param params.webappPath - optional path to webapp folder, where manifest is
 * @param params.askForOverwrite - optional, whether to overwrite services in mockserver config
 * @param params.fs - optional memfs editor instance
 * @returns - array of questions that serves as input for prompt module
 */
export function getMockserverConfigQuestions(params?: {
    webappPath?: string;
    askForOverwrite?: boolean;
    fs?: Editor;
}): PromptObject[] {
    const prompts: PromptObject[] = [];
    const questionPath: Partial<PromptObject> = {
        name: 'path',
        message: t('questions.pathToMock')
    };
    if (params?.webappPath) {
        const fs = params.fs ?? create(createStorage());
        const manifest: Manifest = JSON.parse(fs.read(join(params.webappPath, 'manifest.json')));
        const mainDataSourceUri = getMainServiceDataSource(manifest)?.uri ?? '';
        const oDataSources = getODataSources(manifest);
        const choices: Choice[] = [];
        for (const dsName in oDataSources) {
            choices.push({
                title: `${dsName}: ${oDataSources[dsName].uri}`,
                value: oDataSources[dsName].uri,
                description: oDataSources[dsName].settings?.odataVersion ?? undefined
            });
        }
        if (choices.length > 0) {
            questionPath.type = 'select';
            questionPath.choices = choices;
            questionPath.initial = choices.findIndex((c) => c.value === mainDataSourceUri);
        }
    }
    questionPath.type ||= 'text';
    prompts.push(questionPath as PromptObject);
    if (params?.askForOverwrite) {
        const questionOverwrite: Partial<PromptObject> = {
            type: 'confirm',
            name: 'overwrite',
            message: t('questions.overwrite')
        };
        prompts.push(questionOverwrite as PromptObject);
    }
    return prompts;
}
