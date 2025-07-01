import { pathToFileURL } from 'url';
import { join } from 'path';
import { promises } from 'fs';

import { getProject } from '@sap-ux/project-access';

import { pathFromUri } from '../../src/utils';
import { FioriAnnotationService } from '../../src';

import { PROJECTS } from './projects';
import { createFsEditorForProject } from './virtual-fs';
import { serialize } from './raw-metadata-serializer';

async function updateServiceFile() {
    const srvFilePath = pathFromUri(
        pathToFileURL(join(PROJECTS.V4_CDS_START.root, 'srv', 'incidentservice.cds')).toString()
    );
    const editor = await createFsEditorForProject(PROJECTS.V4_CDS_START.root);
    const path = join(__dirname, '..', 'data', 'cds', 'embedded-annotation-srv.cds');
    const srvCds = await promises.readFile(path, { encoding: 'utf-8' });
    editor.write(srvFilePath, srvCds);
    return editor;
}

const getTestData = async (): Promise<FioriAnnotationService> => {
    const editor = await updateServiceFile();
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

    test('getAnnotationFiles returns local and external annotation files', async () => {
        const service = await getTestData();
        const metadata = service.getSchema();
        expect(serialize(metadata.schema, PROJECTS.V4_CDS_START.root)).toMatchSnapshot();
    });
});
