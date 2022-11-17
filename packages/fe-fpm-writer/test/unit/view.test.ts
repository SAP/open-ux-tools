import os from 'os';
import type { Editor } from 'mem-fs-editor';
import { create } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomView } from '../../src';
import type { CustomView } from '../../src/view/types';
import * as manifest from './sample/view/webapp/manifest.json';
import type { Views, EventHandlerConfiguration } from '../../src/common/types';
import type { Manifest } from '@sap-ux/project-access';

const testDir = join(__dirname, 'sample/view');

describe('CustomView', () => {
    let fs: Editor;
    let updatedManifest: Manifest | any;

    const customView: CustomView = {
        target: 'sample',
        key: 'viewKey',
        label: 'viewLabel',
        name: 'NewCustomView',
        folder: 'extensions/custom'
    };
    const expectedFragmentPath = join(testDir, `webapp/${customView.folder}/${customView.name}.fragment.xml`);

    const getManifestExtension = () => {
        return updatedManifest['sap.ui5']['extends']?.['extensions'];
    };
    const getManifestViews = () => {
        return updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
    };
    const getManifestSegments = () => {
        return { extension: getManifestExtension(), views: getManifestViews() as Views };
    };

    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
        fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
    });

    test('only mandatory properties', () => {
        //sut
        generateCustomView(testDir, customView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { extension, views } = getManifestSegments();
        expect(extension).not.toBeDefined();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('with control `true` (sample table fragment)', () => {
        const testCustomView: CustomView = {
            ...customView,
            control: true
        };
        generateCustomView(testDir, testCustomView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { views } = getManifestSegments();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('with custom control passed in interface', () => {
        const testCustomView: CustomView = {
            ...customView,
            control: '<CustomXML text="" />'
        };
        generateCustomView(testDir, testCustomView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { views } = getManifestSegments();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('with new handler', () => {
        //sut
        const testCustomView: CustomView = {
            ...customView,
            eventHandler: true
        };
        generateCustomView(testDir, testCustomView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { extension, views } = getManifestSegments();

        expect(extension).toMatchSnapshot();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.controller.js'))).toMatchSnapshot();
    });

    test('with existing handler', () => {
        const controllerPath = 'my.test.App.ext.ExistingHandler.onCustomAction';
        fs.write(controllerPath, 'dummyContent');
        const testCustomView: CustomView = {
            ...customView,
            eventHandler: controllerPath
        };
        generateCustomView(testDir, testCustomView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { extension, views } = getManifestSegments();

        expect(extension).toMatchSnapshot();
        expect(views).toMatchSnapshot();
        expect(fs.exists(controllerPath)).toBe(true);
        expect(fs.read(controllerPath)).toEqual('dummyContent');
    });

    test('with new handler and new table fragment (all properties)', () => {
        const testCustomView: CustomView = {
            ...customView,
            eventHandler: true,
            control: true
        };
        generateCustomView(testDir, testCustomView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { extension, views } = getManifestSegments();

        expect(extension).toMatchSnapshot();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.controller.js'))).toMatchSnapshot();
    });

    test('with existing views', () => {
        const testManifest = JSON.parse(JSON.stringify(manifest));
        (testManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'] as Views) = {
            paths: [
                {
                    key: 'existingView',
                    annotationPath: 'com.sap.vocabularies.UI.v1.LineItem'
                },
                {
                    key: 'existingView2',
                    annotationPath: 'com.sap.vocabularies.UI.v1.PresentationVariant'
                }
            ],
            showCounts: false
        };
        fs = create(createStorage());
        fs.delete(testDir);
        fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(testManifest));
        const testCustomView: CustomView = {
            ...customView,
            control: true
        };
        generateCustomView(testDir, testCustomView, fs);
        updatedManifest = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const { views } = getManifestSegments();

        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    describe('Test property "eventHandler"', () => {
        const generateCustomViewWithEventHandler = (
            viewId: string,
            eventHandler: string | EventHandlerConfiguration,
            folder?: string
        ) => {
            generateCustomView(testDir, { ...customView, name: viewId, folder, eventHandler }, fs);
        };

        test('"eventHandler" is empty "object" - create new file with default function name', () => {
            const id = customView.name;
            generateCustomViewWithEventHandler(id, {}, customView.folder);
            const xmlPath = join(testDir, `webapp/${customView.folder}/${id}.fragment.xml`);
            expect(fs.read(xmlPath)).toMatchSnapshot();
            expect(fs.read(xmlPath.replace('.fragment.xml', '.controller.js'))).toMatchSnapshot();
        });

        test('"eventHandler" is "object" - create new file with custom file and function names', () => {
            const extension = {
                fnName: 'DummyOnAction',
                fileName: 'dummyAction'
            };
            const id = customView.name;
            generateCustomViewWithEventHandler(id, extension, customView.folder);
            const fragmentName = `${id}.fragment.xml`;
            const xmlPath = join(testDir, `webapp/${customView.folder}/${fragmentName}`);
            expect(fs.read(xmlPath)).toMatchSnapshot();
            expect(fs.read(xmlPath.replace(fragmentName, `${extension.fileName}.controller.js`))).toMatchSnapshot();
        });

        test('"eventHandler" is "object" - create new file with custom function name', () => {
            const extension = {
                fnName: 'DummyOnAction'
            };
            const id = customView.name;
            generateCustomViewWithEventHandler(id, extension, customView.folder);
            const xmlPath = join(testDir, `webapp/${customView.folder}/${id}.fragment.xml`);
            expect(fs.read(xmlPath)).toMatchSnapshot();
            expect(fs.read(xmlPath.replace('.fragment.xml', '.controller.js'))).toMatchSnapshot();
        });

        const positions = [
            {
                name: 'position as object',
                position: {
                    line: 8,
                    character: 9
                }
            },
            {
                name: 'absolute position',
                position: 196 + 8 * os.EOL.length
            }
        ];
        test.each(positions)(
            '"eventHandler" is object. Append new function to existing js file with $name',
            ({ position }) => {
                const fileName = 'MyExistingAction';
                // Create existing file with existing actions
                const folder = join('extensions', 'custom');
                const existingPath = join(testDir, 'webapp', folder, `${fileName}.controller.js`);
                // Generate handler with single method - content should be updated during generating of custom view
                fs.copyTpl(join(__dirname, '../../templates', 'common/EventHandler.js'), existingPath);
                const fnName = 'onHandleSecondAction';

                const extension = {
                    fnName,
                    fileName,
                    insertScript: {
                        fragment: `,\n        ${fnName}: function() {\n            MessageToast.show("Custom handler invoked.");\n        }`,
                        position
                    }
                };

                const id = customView.name;
                generateCustomViewWithEventHandler(id, extension, folder);
                const xmlPath = join(testDir, 'webapp', folder, `${id}.fragment.xml`);
                expect(fs.read(xmlPath)).toMatchSnapshot();
                // Check update js file content
                expect(fs.read(existingPath)).toMatchSnapshot();
            }
        );
    });
});
