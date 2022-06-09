import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomView } from '../../src';
import { CustomView } from '../../src/view/types';
import * as manifest from './sample/view/webapp/manifest.json';
import type { Views } from '../../src/common/types';
import type { Manifest } from '@sap-ux/ui5-config';

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
    const expectedFragmentPath = join(testDir, 'webapp', customView.folder!, `${customView.name}.fragment.xml`);

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
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
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
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
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
});
