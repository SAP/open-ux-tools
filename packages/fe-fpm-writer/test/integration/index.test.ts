import { join, relative } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateCustomAction, generateCustomColumn, generateCustomPage, TargetControl } from '../../src';
import { Placement } from '../../src/common/types';

describe('use FPM with existing apps', () => {
    const testInput = join(__dirname, '../test-input');
    const testOutput = join(__dirname, '../test-output');
    const debug = !!process.env['UX_DEBUG'];
    const fs = create(createStorage());

    beforeAll(() => {
        fs.delete(testOutput);
    });

    afterAll(() => {
        if (debug) {
            fs.commit(() => {});
        }
    });

    describe('extend Fiori elements for OData v4 ListReport ObjectPage', () => {
        const targetPath = join(testOutput, 'lrop');
        test('generateCustomPage with navigation from ObjectPage', () => {
            fs.copy(join(testInput, 'basic-lrop'), targetPath);
            generateCustomPage(
                targetPath,
                {
                    name: 'MyCustomPage',
                    entity: 'Booking',
                    navigation: {
                        sourceEntity: 'Travel',
                        sourcePage: 'TravelObjectPage',
                        navEntity: '_Booking'
                    }
                },
                fs
            );
        });

        test('generateCustomColumn in ListReport', () => {
            fs.copy(join(testInput, 'basic-lrop'), targetPath);
            generateCustomColumn(
                targetPath,
                {
                    target: 'TravelList',
                    targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
                    name: 'NewCustomColumn',
                    header: 'Custom Price and Currency',
                    eventHandler: true,
                    position: {
                        placement: Placement.After,
                        anchor: 'DataField::TravelID'
                    },
                    properties: ['TotalPrice', 'CurrencyCode']
                },
                fs
            );
        });

        test('generateCustomAction in ListReport and ObjectPage', () => {
            fs.copy(join(testInput, 'basic-lrop'), targetPath);

            generateCustomAction(
                targetPath,
                {
                    name: 'MyCustomAction',
                    target: {
                        page: 'TravelList',
                        control: TargetControl.table
                    },
                    settings: {
                        text: 'My Custom Action',
                        eventHandler: true
                    }
                },
                fs
            );
            generateCustomAction(
                targetPath,
                {
                    name: 'AnotherCustomAction',
                    target: {
                        page: 'TravelObjectPage',
                        control: TargetControl.header
                    },
                    settings: {
                        text: 'My other Action',
                        eventHandler: true
                    }
                },
                fs
            );
        });

        afterAll(() => {
            if (!debug) {
                expect(
                    (fs as any).dump(relative(process.cwd(), targetPath), '**/webapp/{manifest.json,ext/**/*}')
                ).toMatchSnapshot();
            }
        });
    });
});
