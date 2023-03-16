import type { Manifest } from '@sap-ux/project-access';
import { create as createStorage } from 'mem-fs';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { join } from 'path';
import type { Choice, PromptObject } from 'prompts';
import { t } from '..';
import { getMainServiceDataSource, getODataSources } from '../app-info';

/**
 * Return the list of questions to configure mockserver.
 *
 * @param params - optional parameters used to fill default values
 * @param params.webappPath - optional path to webapp folder, where manifest is
 * @param params.fs - optional memfs editor instance
 * @returns - array of questions that serves as input for prompt module
 */
export function getMockserverConfigQuestions(params?: { webappPath?: string; fs?: Editor }): PromptObject[] {
    const question: Partial<PromptObject> = {
        name: 'path',
        message: t('questions.pathToMock')
    };
    if (params?.webappPath) {
        const fs = params.fs || create(createStorage());
        const manifest: Manifest = JSON.parse(fs.read(join(params.webappPath, 'manifest.json')));
        const mainDataSourceUri = getMainServiceDataSource(manifest)?.uri || '';
        const oDataSources = getODataSources(manifest);
        const choices: Choice[] = [];
        for (const dsName in oDataSources) {
            choices.push({
                title: `${dsName}: ${oDataSources[dsName].uri}`,
                value: oDataSources[dsName].uri,
                description: oDataSources[dsName].settings?.odataVersion || undefined
            });
        }
        if (choices.length > 0) {
            question.type = 'select';
            question.choices = choices;
            question.initial = choices.findIndex((c) => c.value === mainDataSourceUri);
        }
    }
    question.type ||= 'text';
    return [question as PromptObject];
}
