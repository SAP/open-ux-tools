import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generateCustomColumn, generateCustomPage } from '../../src';
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

    describe('generateCustomPage', () => {
        test('add custom page to LROP navigating from ObjectPage', () => {
            const targetPath = join(testOutput, 'page/lrop');
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
    });

    describe('generateCustomColumn', () => {
        test('add custom column to ListReport', () => {
            const targetPath = join(testOutput, 'column/lrop');
            fs.copy(join(testInput, 'basic-lrop'), targetPath);

            generateCustomColumn(
                targetPath,
                {
                    target: 'TravelList',
                    targetEntity: '@com.sap.vocabularies.UI.v1.LineItem',
                    name: 'NewCustomColumn',
                    header: 'Custom Column',
                    eventHandler: true,
                    position: {
                        placement: Placement.After,
                        anchor: 'DataField::TravelID'
                    }
                },
                fs
            );
        });
    });
});
