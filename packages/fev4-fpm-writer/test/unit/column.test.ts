import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { generateCustomColumn } from '../../src';
import { getManifestRoot } from '../../src/column/version';
import { Availability, EventHandler, HorizontalAlign, Placement, TableCustomColumn } from '../../src/column/types';
import * as Manifest from '../data/columnManifest.json';
import { xml2json } from 'xml-js';

const testDir = 'fpm/column/test';

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
        let handler: EventHandler | undefined;
        const customColumn: TableCustomColumn = {
            target: 'sample',
            targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
            id: 'NewColumn',
            header: 'col header',
            template: join(testDir, 'webapp/custom/CustomColumn'),
            position: {
                placement: Placement.After,
                anchor: 'DataField::BooleanProperty'
            }
        };
        const testVersions = [1.86, 1.85, 1.84];
        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(Manifest));
        });
        test.each(testVersions)('generateCustomColumn, no handler, only mandatory properties', (ui5Version) => {
            //sut
            generateCustomColumn(fs, testDir, customColumn, handler, ui5Version);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toBeDefined();
            expect(settings.controlConfiguration['items/@com.sap.vocabularies.UI.v1.LineItem']).toBeDefined();
            const newColumn = settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'];
            expect(newColumn).toBeDefined();
            expect(newColumn.columns['NewColumn']).toEqual({
                header: 'col header',
                position: { placement: 'After', anchor: 'DataField::BooleanProperty' },
                template: 'fpm/column/test/webapp/custom/CustomColumn'
            });

            const view = fs.read(join(testDir, 'webapp/custom/CustomColumn.view.xml'));
            expect(view).toMatchSnapshot();
        });
        test('generateCustomColumn 1.86, with handler, all properties', () => {
            const testCustomColumn: TableCustomColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px',
                properties: ['ID', 'TotalNetAmount', '_CustomerPaymentTerms/CustomerPaymentTerms']
            };
            handler = {
                fileName: join(testDir, 'webapp/custom/controller/CustomColumn'),
                predefinedMethod: 'buttonPressed'
            };
            generateCustomColumn(fs, testDir, testCustomColumn, handler, 1.86);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toBeDefined();
            expect(settings.controlConfiguration['items/@com.sap.vocabularies.UI.v1.LineItem']).toBeDefined();
            const newColumn = settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'];
            expect(newColumn).toBeDefined();
            expect(newColumn.columns['NewColumn']).toEqual({
                header: 'col header',
                position: { placement: 'After', anchor: 'DataField::BooleanProperty' },
                template: 'fpm/column/test/webapp/custom/CustomColumn',
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px',
                properties: ['ID', 'TotalNetAmount', '_CustomerPaymentTerms/CustomerPaymentTerms']
            });

            const view = fs.read(join(testDir, 'webapp/custom/CustomColumn.view.xml'));
            expect(view).toBeDefined();
            const viewJson = JSON.parse(xml2json(view, { compact: true }));
            const layout = viewJson['core:FragmentDefinition']['l:VerticalLayout'];
            expect(layout).toBeDefined;
            expect(layout['_attributes']['core:require']).toBeDefined;
            expect(layout['Button']['_attributes']).toEqual({ text: 'to be defined', press: 'handler.buttonPressed' });

            const controller = fs.read(join(testDir, 'webapp/custom/controller/CustomColumn.js'));
            expect(controller).toMatchSnapshot();
        });
        test('generateCustomColumn 1.85, no handler, all properties', () => {
            const testCustomColumn: TableCustomColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px'
            };
            generateCustomColumn(fs, testDir, testCustomColumn, handler, 1.85);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));
            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toBeDefined();
            expect(settings.controlConfiguration['items/@com.sap.vocabularies.UI.v1.LineItem']).toBeDefined();
            const newColumn = settings.controlConfiguration['@com.sap.vocabularies.UI.v1.LineItem'];
            expect(newColumn).toBeDefined();
            expect(newColumn.columns['NewColumn']).toEqual({
                header: 'col header',
                position: { placement: 'After', anchor: 'DataField::BooleanProperty' },
                template: 'fpm/column/test/webapp/custom/CustomColumn',
                availability: Availability.Adaptation,
                width: '150px'
            });

            const view = fs.read(join(testDir, 'webapp/custom/CustomColumn.view.xml'));
            expect(view).toMatchSnapshot();
        });
    });
});
