import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generate } from '../../../src';
import type { AdpWriterConfig } from '../../../src/types';
import { rimraf } from 'rimraf';
import { migrateAdp } from '../../../src/writer';

describe('ADP writer', () => {
    const fs = create(createStorage());
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '../../fixtures/test-output');
    const migrateInputDir = join(__dirname, '../../fixtures/webide-adaptation-project');
    const migrateOutputDir = join(__dirname, '../../fixtures/test-output/webide-adaptation-project');

    beforeAll(async () => {
        await rimraf(outputDir);
    }, 10000);

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

        test('add deploy config', async () => {
            const projectDir = join(outputDir, 'deploy');
            await generate(
                projectDir,
                {
                    ...config,
                    deploy: {
                        package: '$TMP'
                    }
                },
                fs
            );
            expect(
                fs.dump(
                    projectDir,
                    (file) => file.dirname === projectDir && ['package.json', 'ui5-deploy.yaml'].includes(file.basename)
                )
            ).toMatchSnapshot();
        });

        test('enable Fiori tools', async () => {
            const projectDir = join(outputDir, 'fiori-tools');
            await generate(
                projectDir,
                {
                    ...config,
                    deploy: {
                        package: '$TMP'
                    },
                    options: {
                        fioriTools: true
                    }
                },
                fs
            );
            expect(
                fs.dump(
                    projectDir,
                    (file) =>
                        file.dirname === projectDir &&
                        ['package.json', 'ui5.yaml', 'ui5-deploy.yaml'].includes(file.basename)
                )
            ).toMatchSnapshot();
        });
    });

    describe('migrate', () => {
        test('migrate minimal config', async () => {
            fs.copy(migrateInputDir, migrateOutputDir);
            expect(fs.exists(join(migrateOutputDir, 'ui5.yaml'))).toBeFalsy();
            await migrateAdp(migrateOutputDir, config, fs);
            expect(fs.dump(migrateOutputDir)).toMatchSnapshot();
            expect(fs.exists(join(migrateOutputDir, 'ui5.yaml'))).toBeTruthy();
            expect(fs.exists(join(migrateOutputDir, 'package.json'))).toBeTruthy();
        });
    });
});
