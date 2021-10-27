import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomColumn } from '../../src';
import { getManifestRoot } from '../../src/column/version';
import { Placement, TableCustomColumn } from '../../src/column/types';
import * as Manifest from '../data/columnManifest.json';

const testDir = '' + Date.now();

describe('CustomAction', () => {
    describe('getTemplateRoot', () => {
        const testInput = [
            { version: 1.9, expected: join(__dirname, '..', '..', 'templates', 'column', '1.86') },
            { version: 1.96, expected: join(__dirname, '..', '..', 'templates', 'column', '1.86') },
            { version: 1.84, expected: join(__dirname, '..', '..', 'templates', 'column', '1.84') },
            { version: undefined, expected: join(__dirname, '..', '..', 'templates', 'column', '1.86') },
            { version: 1.85, expected: join(__dirname, '..', '..', 'templates', 'column', '1.85') },
            { version: 1.86, expected: join(__dirname, '..', '..', 'templates', 'column', '1.86') }
        ];
        test.each(testInput)('get root path of template', ({ version, expected }) => {
            expect(getManifestRoot(version)).toEqual(expected);
        });
        test('invalid version', () => {
            try {
                getManifestRoot(1.8);
                expect(true).toBeFalsy();
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });
    describe('generateCustomColumn', () => {
        let fs: Editor;
        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp', 'manifest.json'), JSON.stringify(Manifest));
        });
        test('generateCustomColumn, version 1.86, no handler, only mandatory properties', () => {
            const customColumn: TableCustomColumn = {
                target: 'sample',
                targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
                id: 'NewColumn',
                header: 'col header',
                template: 'customColumnContent.CustomColumn',
                position: {
                    placement: Placement.After,
                    anchor: 'DataField::BooleanProperty'
                }
            };
            const handler = undefined;
            const ui5Version = 1.86;
            //sut
            generateCustomColumn(testDir, customColumn, handler, ui5Version, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp', 'manifest.json'));
            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toBeDefined();
            expect(settings.controlConfiguration['items/@com.sap.vocabularies.UI.v1.LineItem']).toBeDefined();
            const newColumn = settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'];
            expect(newColumn).toBeDefined();
            expect(newColumn.columns['NewColumn']).toEqual({
                header: 'col header',
                position: { placement: 'After', anchor: 'DataField::BooleanProperty' },
                template: 'customColumnContent.CustomColumn'
            });

            expect(
                fs.read(join(testDir, 'webapp', 'ext', 'customColumnContent', 'CustomColumn.view.xml'))
            ).toMatchSnapshot();
        });
    });
});
