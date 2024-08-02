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
        annoServiceParams = { project, serviceName: cdsServiceName, appName: cdsAppName };
    });

    test('generate default facets', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Capex',
            annotationFilePath: editableFileRelative,
            addFacets: true
        };
        await generateAnnotations(fsEditor, annoServiceParams, options);
        const content = fsEditor.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });

    test('generate default LineItems', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Consultants',
            annotationFilePath: editableFileRelative,
            addLineItems: true
        };
        await generateAnnotations(fsEditor, annoServiceParams, options);
        const content = fsEditor.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });

    describe('value helps', () => {
        test('do not generate value helps (cds.odata.valuelist present)', async () => {
            const content = `
                using MainService as service from '../../srv/service';

                annotate service.CapexType with @cds.odata.valuelist;
                annotate service.Currencies with @cds.odata.valuelist;
                annotate sarvice.Countries with @cds.odata.valuelist;
                annotate service.BusinessUnits with @cds.odata.valuelist;
            `;

            fsEditor.write(annotationFilePathAbsolute, content);
            const options: GenerateAnnotationsOptions = {
                entitySetName: 'Capex',
                annotationFilePath: editableFileRelative,
                addValueHelps: true
            };
            const generated = await generateAnnotations(fsEditor, annoServiceParams, options);
            expect(generated).toBe(false);
        });

        test('generate value helps', async () => {
            const options: GenerateAnnotationsOptions = {
                entitySetName: 'Capex',
                annotationFilePath: editableFileRelative,
                addValueHelps: true
            };
            await generateAnnotations(fsEditor, annoServiceParams, options);
            const content = fsEditor.read(annotationFilePathAbsolute);
            expect(content).toMatchSnapshot();
        });
    });

    test('example', async () => {
        const project = await getProject(projectRootFolder);
        const fs = createEditor(createStore());

        const serviceParameters: AnnotationServiceParameters = {
            project,
            serviceName: 'MainService',
            appName: 'app/project1'
        };

        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Capex',
            annotationFilePath: editableFileRelative,
            addValueHelps: true,
            addFacets: true,
            addLineItems: true
        };
        await generateAnnotations(fs, serviceParameters, options);
        const content = fs.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });
});
