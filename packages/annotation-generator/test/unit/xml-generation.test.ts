import { join } from 'path';
import { create as createStore } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

import { getProject } from '@sap-ux/project-access';
import type { AnnotationServiceParameters, GenerateAnnotationsOptions } from '../../src';
import { generateAnnotations } from '../../src';
import { adaptFilePath } from '../../src/utils';

const testDataFolder = 'data';
const edmxProjectFolder = 'xml-generation';
const editableFileRelative = join('webapp', 'annotations', 'annotation.xml');
const projectRootFolder = join(__dirname, '..', testDataFolder, edmxProjectFolder);
const annotationFilePathAbsolute = adaptFilePath(join(projectRootFolder, editableFileRelative));

describe('annotation generation (XML)', () => {
    let annoServiceParams: AnnotationServiceParameters;
    let fsEditor: Editor;

    beforeEach(async () => {
        const project = await getProject(projectRootFolder);
        fsEditor = createEditor(createStore());
        annoServiceParams = { project, serviceName: 'mainService', appName: undefined };
    });

    test('instantiation - support project folder', async () => {
        let e: Error | undefined;
        try {
            const options: GenerateAnnotationsOptions = {
                entitySetName: 'Incidents',
                annotationFilePath: editableFileRelative,
                addFacets: true
            };
            const params: AnnotationServiceParameters = { ...annoServiceParams, project: projectRootFolder };
            await generateAnnotations(fsEditor, params, options);
        } catch (error) {
            e = error;
        }
        expect(e).toBeUndefined();
    });

    test('instantiation - error for wrong folder', async () => {
        let e: Error | undefined;
        try {
            const options: GenerateAnnotationsOptions = {
                entitySetName: 'Incidents',
                annotationFilePath: editableFileRelative,
                addFacets: true
            };
            const params: AnnotationServiceParameters = { ...annoServiceParams, project: `${projectRootFolder}__` };
            await generateAnnotations(fsEditor, params, options);
        } catch (error) {
            e = error;
        }
        expect(!!e).toBe(true);
    });

    test('wrong entity set', async () => {
        let e: Error | undefined;
        try {
            const options: GenerateAnnotationsOptions = {
                entitySetName: 'Incidents___',
                annotationFilePath: editableFileRelative,
                addFacets: true
            };
            await generateAnnotations(fsEditor, annoServiceParams, options);
        } catch (error) {
            e = error;
        }
        expect(e?.toString()).toStrictEqual('Error: Entity set not found: Incidents___');
    });

    test('generate facets', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Individual',
            annotationFilePath: editableFileRelative,
            addFacets: true
        };
        await generateAnnotations(fsEditor, annoServiceParams, options);
        const content = fsEditor.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });

    test('generate line items', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Incidents',
            annotationFilePath: editableFileRelative,
            addLineItems: true
        };
        await generateAnnotations(fsEditor, annoServiceParams, options);
        const content = fsEditor.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });

    test('do not generate facets if they already exist', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Incidents',
            annotationFilePath: editableFileRelative,
            addFacets: true
        };
        const generated = await generateAnnotations(fsEditor, annoServiceParams, options);
        expect(generated).toBeFalsy();
    });

    test('generate value helps', async () => {
        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Incidents',
            annotationFilePath: editableFileRelative,
            addValueHelps: true
        };
        await generateAnnotations(fsEditor, annoServiceParams, options);
        const content = fsEditor.read(annotationFilePathAbsolute);
        expect(content).toMatchSnapshot();
    });

    test('example', async () => {
        const project = await getProject(projectRootFolder);
        const fs = createEditor(createStore());

        const serviceParameters: AnnotationServiceParameters = {
            project,
            serviceName: 'mainService'
        };

        const options: GenerateAnnotationsOptions = {
            entitySetName: 'Individual',
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
