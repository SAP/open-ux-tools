import { create, Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join, resolve, relative } from 'path';
import { generateCustomColumn } from '../../src';
import { getManifestRoot } from '../../src/column/version';
import { Availability, EventHandler, HorizontalAlign, Placement, TableCustomColumn } from '../../src/column/types';
import * as manifest from './sample/column/webapp/manifest.json';

const testDir = join(__dirname, 'sample/column');

describe('CustomAction', () => {
    describe('getTemplateRoot', () => {
        const testInput = [
            { version: 1.9, expected: join(__dirname, '../../templates/column/1.86') },
            { version: 1.96, expected: join(__dirname, '../../templates/column/1.86') },
            { version: 1.84, expected: join(__dirname, '../../templates/column/1.84') },
            { version: undefined, expected: join(__dirname, '../../templates/column/1.86') },
            { version: 1.85, expected: join(__dirname, '../../templates/column/1.85') },
            { version: 1.86, expected: join(__dirname, '../../templates/column/1.86') }
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
        let handler: EventHandler;
        const customColumn: TableCustomColumn = {
            target: 'sample',
            targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
            id: 'NewColumn',
            header: 'col header',
            template: 'ext.CustomColumn',
            position: {
                placement: Placement.After,
                anchor: 'DataField::BooleanProperty'
            }
        };
        const expectedViewPath = join(testDir, `webapp/${customColumn.template.replace('.', '/')}.view.xml`);
        const testVersions = [1.86, 1.85, 1.84];
        beforeEach(() => {
            fs = create(createStorage());
            fs.delete(testDir);
            fs.write(join(testDir, 'webapp/manifest.json'), JSON.stringify(manifest));
        });
        test.each(testVersions)('generateCustomColumn, no handler, only mandatory properties', (ui5Version) => {
            //sut
            generateCustomColumn(testDir, customColumn, handler, ui5Version, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedViewPath)).toMatchSnapshot();
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
                fileName: ('sap.fe.core.fpmExplorer.customColumnContent.' + customColumn.template).replace(/\./g, '/'),
                predefinedMethod: 'buttonPressed'
            };
            generateCustomColumn(testDir, testCustomColumn, handler, 1.86, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedViewPath)).toMatchSnapshot();
        });
        test('generateCustomColumn 1.85, no handler, all properties', () => {
            const testCustomColumn: TableCustomColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px'
            };
            generateCustomColumn(testDir, testCustomColumn, handler, 1.85, fs);
            const updatedManifest: any = fs.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(fs.read(expectedViewPath)).toMatchSnapshot();
        });
        test('generateCustomColumn 1.85, no handler, no fs, all properties', () => {
            const testCustomColumn: TableCustomColumn = {
                ...customColumn,
                availability: Availability.Adaptation,
                horizontalAlign: HorizontalAlign.Center,
                width: '150px'
            };

            const testFS = generateCustomColumn(testDir, testCustomColumn, handler, 1.85);
            const updatedManifest: any = testFS.readJSON(join(testDir, 'webapp/manifest.json'));

            const settings = updatedManifest['sap.ui5']['routing']['targets']['sample']['options']['settings'];
            expect(settings).toBeDefined();
            expect(settings.controlConfiguration).toMatchSnapshot();

            expect(testFS.read(expectedViewPath)).toMatchSnapshot();
        });
    });
});
