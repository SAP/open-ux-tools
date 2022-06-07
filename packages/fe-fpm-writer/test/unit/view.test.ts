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

        const views = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
        expect(views).toBeDefined();
        expect(views.paths).toBeDefined();
        expect(views.paths[0]).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });

    test('with new handler, all properties', () => {
        //sut
        generateCustomView(testDir, { ...customView, key: 'customViewKey', eventHandler: true }, fs);
        const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

        const views = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views'];
        expect(views).toBeDefined();
        expect(views.paths).toBeDefined();
        expect(views.paths[0]).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath.replace('.fragment.xml', '.js'))).toMatchSnapshot();
    });

    test('with custom control passed in interface', () => {
        const testCustomView: CustomView = {
            ...customView,
            control: '<CustomXML text="" />'
        };
        generateCustomView(testDir, testCustomView, fs);
        const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

        const view =
            updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings']['views']['paths'][0];
        expect(view).toMatchSnapshot();
        expect(fs.read(expectedFragmentPath)).toMatchSnapshot();
    });
});
