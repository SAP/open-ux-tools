import { join } from 'path';
import { create as createStore } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

import { getProject } from '@sap-ux/project-access';
import type { AnnotationServiceParameters, GenerateAnnotationsOptions } from '../../src';
import { generateAnnotations } from '../../src';
import { adaptFilePath } from '../../src/utils';

const testDataFolder = 'data';
const cdsProjectFolder = 'cds-generation';
const cdsServiceName = 'MainService';
const cdsAppName = join('app', 'project1');
const editableFileRelative = join(cdsAppName, 'annotations.cds');
const projectRootFolder = join(__dirname, '..', testDataFolder, cdsProjectFolder);
const annotationFilePathAbsolute = adaptFilePath(join(projectRootFolder, editableFileRelative));

describe(`annotation generation (CDS)`, () => {
    let annoServiceParams: AnnotationServiceParameters;
    let fsEditor: Editor;

    beforeEach(async () => {
        const project = await getProject(projectRootFolder);
        fsEditor = createEditor(createStore());
        fsEditor.write(annotationFilePathAbsolute, '');
        annoServiceParams = { project, serviceName: cdsServiceName, appName: cdsAppName, writeSapAnnotations: true };
    });

    test('generate default facets and line items', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Consultants',
            annotationFilePath: editableFileRelative,
            addFacets: true,
            addLineItems: true
        };
        await generateAnnotations(fsEditor, annoServiceParams, options);
        const content = fsEditor.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });
});
