import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generate } from '../../src';
import type { AdpWriterConfig } from '../../src/types';
import { rimraf } from 'rimraf';
import { parse, config } from 'dotenv';

describe('ADP integration test', () => {
    const outputDir = join(__dirname, '../fixtures/test');

    beforeAll(async () => {
        await rimraf(outputDir);
    });

    describe('generate / install / preview', () => {

        config({ path: join(__dirname, '.env') });
        const writerConfig = {
            app: {
                id: process.env['ADP_APP_ID'],
                reference: process.env['ADP_APP_REFERENCE']
            },
            target: {
                url: process.env['ADP_TARGET_URL']
            }
        } as AdpWriterConfig;
        
        test('minimal config', async () => {
            let projectDir = join(outputDir, 'from-env');
            const fs = await generate(projectDir, writerConfig);
            await new Promise(resolve => fs.commit(resolve));
        });
    });
});
