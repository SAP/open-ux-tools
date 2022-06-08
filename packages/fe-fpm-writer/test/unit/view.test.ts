import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomView } from '../../src';
import { CustomView } from '../../src/view/types';
import * as manifest from './sample/column/webapp/manifest.json';

const testDir = join(__dirname, 'sample/view');

describe('CustomView', () => {
    let fs: Editor;
    const customView: CustomView = {
        target: 'sample',
        key: 'viewKey',
        label: 'viewLabel',
        name: 'NewCustomView',
        folder: 'extensions/custom'
    };
    const expectedFragmentPath = join(testDir, 'webapp', customView.folder!, `${customView.name}.fragment.xml`);
    beforeEach(() => {
        fs = create(createStorage());
        fs.delete(testDir);
        fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
    });

    test('only mandatory properties', () => {
        //sut
        generateCustomView(testDir, customView, fs);
        const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const extension = updatedManifest['sap.ui5']['extends'];
        const views = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
        expect(extension).not.toBeDefined();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('with new handler', () => {
        //sut
        generateCustomView(testDir, { ...customView, key: 'customViewKey', eventHandler: true }, fs);
        const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const extension = updatedManifest['sap.ui5']['extends']['extensions'];
        const views = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
        expect(extension).toMatchSnapshot();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
    });

    test('with new table fragment', () => {
        const testCustomView: CustomView = {
            ...customView,
            tableControl: true
        };
        generateCustomView(testDir, testCustomView, fs);
        const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const extension = updatedManifest['sap.ui5']['extends'];
        const views = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
        expect(extension).not.toBeDefined();
        expect(views).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('with new handler and new table fragment (all properties)', () => {
        const testCustomView: CustomView = {
            ...customView,
            eventHandler: true,
            tableControl: true
        };
        generateCustomView(testDir, testCustomView, fs);
        const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
        const extension = updatedManifest['sap.ui5']['extends']['extensions'];
        const views = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
        expect(extension).toMatchSnapshot();
        expect(views).toMatchSnapshot();

        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
    });
});
