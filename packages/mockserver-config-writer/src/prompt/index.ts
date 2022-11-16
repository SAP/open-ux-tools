import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { PromptObject } from 'prompts';
import type { Manifest } from '@sap-ux/project-access';
import { getMainServiceDataSource } from '../app-info';

/**
 * Return the list of questions to configure mockserver.
 *
 * @param params - optional parameters used to fill default values
 * @param params.webappPath - optional path to webapp folder, where manifest is
 * @param params.fs - optional memfs editor instance
 * @returns - array of questions that serves as input for prompt module
 */
export function getMockserverConfigQuestions(params?: { webappPath?: string; fs?: Editor }): PromptObject[] {
    let path = '';
    if (params?.webappPath) {
        const fs = params.fs || create(createStorage());
        const manifest: Manifest = JSON.parse(fs.read(join(params.webappPath, 'manifest.json')));
        path = getMainServiceDataSource(manifest)?.uri || '';
    }
    return [
        {
            name: 'path',
            type: 'text',
            message: 'Path to mocked service',
            initial: path
        }
    ];
}
