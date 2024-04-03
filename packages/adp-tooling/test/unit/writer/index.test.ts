import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { generate, generateEnv, generateCf } from '../../../src';
import type { AdpWriterConfig, CfWriterConfig } from '../../../src/types';
import { rimraf } from 'rimraf';

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
            await generate(projectDir, config);
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

        test('enable s4hana cloud', async () => {
            const projectDir = join(outputDir, 's4hana');
            await generate(
                projectDir,
                {
                    ...config,
                    deploy: {
                        package: '$TMP'
                    },
                    options: {
                        fioriTools: true,
                        isRunningInBAS: true,
                        isCloudProject: true
                    },
                    ui5: {
                        ui5Version: '1.122.1'
                    },
                    customConfig: {
                        adp: {
                            safeMode: false
                        }
                    },
                    flp: {
                        bspName: 'bsp.test.app',
                        languages: [
                            {
                                sap: 'testId',
                                i18n: 'testKey'
                            }
                        ]
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

    describe('generateEnv', () => {
        test('generate env file for s4hana cloud projects minimal', async () => {
            const projectDir = join(outputDir, 'minimal');
            await generateEnv(projectDir, '');
            expect(
                fs.dump(projectDir, (file) => file.dirname === projectDir && ['.env'].includes(file.basename))
            ).toMatchSnapshot();
        });

        test('generate env file for s4hana cloud projects', async () => {
            const projectDir = join(outputDir, 'env');
            const data = `ABAP_USERNAME: test_name
                          ABAP_PASSWORD: test_pass`;
            await generateEnv(projectDir, data, fs);
            expect(
                fs.dump(projectDir, (file) => file.dirname === projectDir && ['.env'].includes(file.basename))
            ).toMatchSnapshot();
        });
    });

    describe('generateCf', () => {
        const config: CfWriterConfig = {
            app: {
                appHostId: 'app.id',
                appName: 'test_app',
                appVersion: '',
                appId: '',
                module: 'test_app',
                moduleTitle: '',
                appVariantId: '',
                projectName: 'test_app',
                i18nGuid: '',
                projectPath: '',
                addSecurity: '',
                addStandaloneApprouter: false,
                sapCloudService: '',
                xsSecurityProjectName: '',
                org: '',
                space: '',
                html5RepoRuntime: ''
            },
            appdescr: {
                fileName: 'manifest',
                layer: 'VENDOR',
                fileType: '',
                reference: '',
                id: '',
                namespace: '',
                version: '',
                content: []
            },
            adpConfig: {
                componentname: '',
                safeMode: false,
                appvariant: '',
                layer: 'VENDOR',
                isOVPApp: false,
                isFioriElement: false,
                environment: '',
                ui5Version: '',
                cfSpace: '',
                cfOrganization: '',
                cfApiUrl: ''
            }
        };

        test('minimal config', async () => {
            const projectDir = join(outputDir, 'minimal');
            await generateCf(projectDir, config);
            expect(fs.dump(projectDir)).toMatchSnapshot();
        });

        test('add standalone approuter', async () => {
            const projectDir = join(outputDir, 'standalone-approuter');
            config.app.addStandaloneApprouter = true;
            await generateCf(projectDir, config, fs);
            expect(
                fs.dump(
                    projectDir,
                    (file) =>
                        file.dirname === projectDir ||
                        file.dirname === join(projectDir, 'webapp') ||
                        file.dirname === join(projectDir, 'approuter') ||
                        (file.dirname === join(projectDir, '.adp') &&
                            [
                                'manifest.appdescr_variant',
                                'package.json',
                                'ui5.yaml',
                                'config.json',
                                'xs-security.json',
                                'xs-app.json'
                            ].includes(file.basename))
                )
            ).toMatchSnapshot();
        });
    });
});
