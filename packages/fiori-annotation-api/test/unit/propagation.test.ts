import { promises } from 'fs';
import { pathToFileURL } from 'url';
import { join } from 'path';

import type { Editor } from 'mem-fs-editor';
import { getProject } from '@sap-ux/project-access';

import { pathFromUri } from '../../src/utils';
import { FioriAnnotationService } from '../../src';

import { createFsEditorForProject } from './virtual-fs';
import { serialize } from './raw-metadata-serializer';
import { PROJECTS } from './projects';

async function updateDBLayerFile(root: string): Promise<Editor> {
    const srvFilePath = pathFromUri(pathToFileURL(join(root, 'db', 'schema.cds')).toString());
    const path = join(__dirname, '..', 'data', 'cds', 'propagation-schema.cds');
    const dbSchema = await promises.readFile(path, { encoding: 'utf-8' });
    const editor = await createFsEditorForProject(root);
    editor.write(srvFilePath, dbSchema);
    return editor;
}

const getTestData = async (): Promise<FioriAnnotationService> => {
    const editor = await updateDBLayerFile(PROJECTS.V4_CDS_START.root);
    const project = await getProject(PROJECTS.V4_CDS_START.root);
    const service = await FioriAnnotationService.createService(project, 'IncidentService', '', editor, {
        commitOnSave: false
    });
    await service.sync();
    return service;
};

describe('check reading of embedded annotations (CDS)', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test('propagated annotations', async () => {
        const service = await getTestData();
        const metadata = service.getSchema();
        expect(serialize(metadata.schema, PROJECTS.V4_CDS_START.root)).toMatchSnapshot();
    });
});
