import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generate } from '../../../src';
import type { AdpWriterConfig } from '../../../src/types';
import { rimraf } from 'rimraf';

describe('ADP writer', () => {
    const fs = create(createStorage());
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '../../fixtures/test');

    beforeAll(async () => {
        await rimraf(outputDir);
    });

    afterAll(() => {
        return new Promise((resolve) => {
            // write out the files for debugging
            if (debug) {
                fs.commit(resolve);
            } else {
                resolve(true);
            }
        });
    });

    const config: AdpWriterConfig = {
        app: {
            id: 'my.test.app',
            reference: 'the.original.app'
        },
        target: {
            url: 'http://sap.example'
        }
    };

    describe('generate', () => {
        test('minimal config', async () => {
            const projectDir = join(outputDir, 'minimal');
            await generate(projectDir, config, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });
    });
});
