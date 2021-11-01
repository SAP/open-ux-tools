import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create, Editor } from 'mem-fs-editor';
import { CustomPage, generateCustomPage } from '../../src';

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
                undefined,
                fs
            );
        });
    });
});
