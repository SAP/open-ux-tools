import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generate } from '../../../src';
import type { AdpWriterConfig } from '../../../src/types';
import { rimraf } from 'rimraf';
import { migrate } from '../../../src/writer';
import { OperationsType } from '@sap-ux/axios-extension';

describe('ADP writer', () => {
    const fs = create(createStorage());
    const debug = !!process.env['UX_DEBUG'];
    const outputDir = join(__dirname, '../../fixtures/test-output');

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
        const migrateConfig: AdpWriterConfig = {
            app: {
                id: 'my.test.app',
                reference: 'the.original.app'
            },
            target: {
                url: 'http://sap.example',
                destination: 'test',
                client: '000'
            },
            customConfig: {
                adp: {
                    environment: 'P',
                    safeMode: true
                }
            },
            options: {
                fioriTools: true
            }
        };
        const migrateInputDir = join(__dirname, '../../fixtures/webide-adaptation-project');

        test('migrate minimal config', async () => {
            const projectDir = join(outputDir, 'webide-adaptation-project');
            fs.copy(migrateInputDir, projectDir, { globOptions: { dot: true } });

            await migrate(projectDir, migrateConfig, fs);
            expect(fs.dump(projectDir)).toMatchSnapshot();
            expect(fs.exists(join(projectDir, '.che/project.json'))).toBeFalsy();
            expect(fs.exists(join(projectDir, 'neo-app.json'))).toBeFalsy();
        });
    });
});
