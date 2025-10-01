import { join } from 'path';
import fs from 'fs';
import fsextra from 'fs-extra';

import type { YUIQuestion, CredentialsAnswers } from '@sap-ux/inquirer-common';
import type { FLPConfigAnswers, TileSettingsAnswers } from '@sap-ux/flp-config-inquirer';
import type { ToolsLogger } from '@sap-ux/logger';
import yeomanTest from 'yeoman-test';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as btpUtils from '@sap-ux/btp-utils';
import * as Logger from '@sap-ux/logger';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import * as inquirerCommon from '@sap-ux/inquirer-common';
import * as projectAccess from '@sap-ux/project-access';
import type { AbapServiceProvider, InboundContent } from '@sap-ux/axios-extension';
import { MessageType } from '@sap-devx/yeoman-ui-types';

import adpFlpConfigGenerator from '../src/app';
import { rimraf } from 'rimraf';
import { EventName } from '../src/telemetryEvents';
import * as sysAccess from '@sap-ux/system-access';
import { t, initI18n } from '../src/utils/i18n';
import * as appWizardCache from '../src/utils/appWizardCache';

const originalCwd = process.cwd();

jest.mock('@sap-ux/system-access', () => ({
    ...jest.requireActual('@sap-ux/system-access'),
    createAbapServiceProvider: jest.fn()
}));
jest.mock('../src/utils/appWizardCache', () => ({
    initAppWizardCache: jest.fn(),
    addToCache: jest.fn(),
    getFromCache: jest.fn(),
    deleteCache: jest.fn()
}));
jest.mock('@sap-ux/system-access');
jest.mock('@sap-ux/btp-utils');
jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    isCFEnvironment: jest.fn(),
    getAdpConfig: jest.fn(),
    generateInboundConfig: jest.fn(),
    getBaseAppInbounds: jest.fn(),
    SystemLookup: jest.fn().mockImplementation(() => ({
        getSystemByName: jest.fn().mockResolvedValue({
            name: 'testDestination'
        }) as unknown as sysAccess.AbapTarget
    }))
}));
jest.mock('@sap-ux/inquirer-common', () => ({
    ...jest.requireActual('@sap-ux/inquirer-common'),
    getCredentialsPrompts: jest.fn(),
    ErrorHandler: jest.fn().mockImplementation(
        () =>
            ({
                getValidationErrorHelp: () => 'Network Error'
            } as unknown as inquirerCommon.ErrorHandler)
    )
}));
jest.mock('@sap-ux/fiori-generator-shared', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: jest.fn().mockReturnValue(new Promise(() => {})),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn().mockReturnValue({
            OperatingSystem: 'testOS',
            Platform: 'testPlatform'
        })
    },
    isExtensionInstalled: jest.fn().mockReturnValue(true),
    getHostEnvironment: jest.fn(),
    isCli: jest.fn().mockReturnValue(false)
}));

const toolsLoggerErrorSpy = jest.fn();
const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: toolsLoggerErrorSpy
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

describe('FLPConfigGenerator Integration Tests', () => {
    jest.spyOn(adpTooling, 'isCFEnvironment').mockReturnValue(false);
    jest.spyOn(sysAccess, 'createAbapServiceProvider').mockResolvedValue({
        isAbapCloud: jest.fn().mockReturnValue(true)
    } as unknown as AbapServiceProvider);
    const generatorPath = join(__dirname, '../../src/app/index.ts');
    const testOutputDir = join(__dirname, 'test-output');
    const credentialsPrompts = {
        prompts: [
            {
                username: 'systemUsername'
            },
            {
                password: 'systemPassword'
            }
        ]
    };
    const destinationList = {
        testDestination: {
            Name: 'https://testUrl',
            Host: '000',
            Type: 'Type',
            Authentication: 'Basic',
            ProxyType: 'Internet',
            Description: 'Description'
        }
    };
    const inbounds = {
        'display-bank': {
            semanticObject: 'baseAppSo',
            action: 'baseAppAction',
            title: 'baseAppTitle',
            subTitle: 'baseAppSubTitle',
            icon: 'sap-icon://baseAppIcon',
            signature: {
                parameters: {
                    param1: {
                        value: 'test1',
                        isRequired: true
                    }
                }
            }
        }
    } as unknown as projectAccess.ManifestNamespace.Inbound;
    let answers:
        | TileSettingsAnswers
        | FLPConfigAnswers
        | {
              username: string;
              password: string;
          };
    const showInformationSpy = jest.fn();
    const mockAppWizard = {
        setHeaderTitle: jest.fn(),
        showInformation: showInformationSpy
    };
    const getCredentialsPromptsSpy = jest
        .spyOn(inquirerCommon, 'getCredentialsPrompts')
        .mockResolvedValue(credentialsPrompts as unknown as YUIQuestion<CredentialsAnswers>[]);
    const vsCodeMessageSpy = jest.fn();
    const vscode = {
        window: {
            showErrorMessage: vsCodeMessageSpy
        }
    };
    jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
    jest.spyOn(adpTooling, 'getBaseAppInbounds').mockResolvedValue(inbounds);
    const generateInboundConfigSpy = jest.spyOn(adpTooling, 'generateInboundConfig');

    beforeEach(async () => {
        answers = {
            username: 'testUsername',
            password: 'testPassword',
            tileHandlingAction: 'replace',
            copyFromExisting: false,
            inboundId: inbounds['display-bank'] as unknown as InboundContent,
            semanticObject: 'testSemanticObject',
            action: 'testAction',
            title: 'testTitle',
            subTitle: 'testSubTitle',
            additionalParameters: '{"param1":"test1","param2":"test2"}'
        };
    });

    afterEach(() => {
        showInformationSpy.mockReset();
        jest.clearAllMocks();
    });

    beforeAll(async () => {
        await initI18n();
        fs.mkdirSync(testOutputDir, { recursive: true });
    });

    afterAll(() => {
        process.chdir(originalCwd); // Generation changes the cwd, this breaks sonar report so we restore later
        rimraf.sync(testOutputDir);
    });

    it('should generate FLP configuration successfully - Application Studio (REPLACE)', async () => {
        const testPath = join(testOutputDir, 'test_project1');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');

        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                loggerMock,
                launchAsSubGen: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.flpConfigAdded'), MessageType.notification);
        expect(generateInboundConfigSpy).toHaveBeenCalledWith(
            testProjectPath,
            expect.objectContaining({
                inboundId: 'customer.baseAppSo-baseAppAction',
                semanticObject: 'baseAppSo',
                action: 'baseAppAction',
                title: 'testTitle',
                subTitle: 'testSubTitle',
                icon: 'sap-icon://baseAppIcon',
                additionalParameters: '{"param1":{"value":"test1","isRequired":true}}'
            }),
            expect.anything()
        );
    });

    it('should generate FLP configuration successfully - Application Studio (ADD/Copy from existing)', async () => {
        (answers as TileSettingsAnswers).tileHandlingAction = 'add';
        (answers as TileSettingsAnswers).copyFromExisting = true;
        (answers as FLPConfigAnswers).semanticObject = 'testSo_New';
        (answers as FLPConfigAnswers).action = 'testAct_New';

        const testPath = join(testOutputDir, 'test_project1');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');

        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                loggerMock,
                launchAsSubGen: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.flpConfigAdded'), MessageType.notification);
        expect(generateInboundConfigSpy).toHaveBeenCalledWith(
            testProjectPath,
            expect.objectContaining({
                inboundId: 'customer.testSo_New-testAct_New',
                semanticObject: 'testSo_New',
                action: 'testAct_New',
                title: 'testTitle',
                subTitle: 'testSubTitle',
                icon: 'sap-icon://baseAppIcon',
                additionalParameters: '{"param1":"test1","param2":"test2"}'
            }),
            expect.anything()
        );
    });

    it('should generate FLP configuration successfully - Application Studio (ADD/Create new)', async () => {
        (answers as TileSettingsAnswers).tileHandlingAction = 'add';
        (answers as TileSettingsAnswers).copyFromExisting = false;
        (answers as FLPConfigAnswers).semanticObject = 'testSo_New';
        (answers as FLPConfigAnswers).action = 'testAct_New';
        (answers as FLPConfigAnswers).title = 'testTitle_New';
        (answers as FLPConfigAnswers).subTitle = 'testSubTitle_New';
        (answers as FLPConfigAnswers).icon = 'sap-icon://Icon_New';
        (answers as FLPConfigAnswers).additionalParameters = '{"param1":"test1","param2":"test2"}';

        const testPath = join(testOutputDir, 'test_project1');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');

        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                loggerMock,
                launchAsSubGen: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.flpConfigAdded'), MessageType.notification);
        expect(generateInboundConfigSpy).toHaveBeenCalledWith(
            testProjectPath,
            expect.objectContaining({
                inboundId: 'customer.testSo_New-testAct_New',
                semanticObject: 'testSo_New',
                action: 'testAct_New',
                title: 'testTitle_New',
                subTitle: 'testSubTitle_New',
                icon: 'sap-icon://Icon_New',
                additionalParameters: '{"param1":"test1","param2":"test2"}'
            }),
            expect.anything()
        );
    });

    it('should generate FLP configuration successfully - Application Studio', async () => {
        const testPath = join(testOutputDir, 'test_project1');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');

        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                loggerMock,
                launchAsSubGen: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();
        const variant = fs.readFileSync(join(testProjectPath, 'webapp', 'manifest.appdescr_variant'), {
            encoding: 'utf8'
        });
        const i18n = fs.readFileSync(join(testProjectPath, 'webapp', 'i18n', 'i18n.properties'), {
            encoding: 'utf8'
        });
        expect(variant).toMatchSnapshot();
        expect(i18n).toMatchSnapshot();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.flpConfigAdded'), MessageType.notification);
    });

    it('should generate FLP configuration successfully - use provider from wizard cache', async () => {
        const testPath = join(testOutputDir, 'test_project1');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');

        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');
        jest.spyOn(adpTooling, 'getBaseAppInbounds');
        const createAbapServiceProviderSpy = jest.spyOn(sysAccess, 'createAbapServiceProvider');
        jest.spyOn(appWizardCache, 'getFromCache').mockImplementationOnce((_, property, __) => {
            if (property === 'credentialsPrompted') {
                return false;
            }
            return {
                isAbapCloud: jest.fn().mockReturnValue(true)
            } as unknown as AbapServiceProvider;
        });

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                loggerMock,
                launchAsSubGen: true,
                inbounds: inbounds,
                layer: adpTooling.FlexLayer.CUSTOMER_BASE
            })
            .withPrompts(answers);
        await expect(runContext.run()).resolves.not.toThrow();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(createAbapServiceProviderSpy).not.toHaveBeenCalled();
        expect(generateInboundConfigSpy).toHaveBeenCalledWith(
            testProjectPath,
            expect.objectContaining({
                inboundId: 'customer.baseAppSo-baseAppAction',
                semanticObject: 'baseAppSo',
                action: 'baseAppAction',
                title: 'testTitle',
                subTitle: 'testSubTitle',
                icon: 'sap-icon://baseAppIcon',
                additionalParameters: '{"param1":{"value":"test1","isRequired":true}}'
            }),
            expect.anything()
        );
    });

    it('should add credentials step in Yeoman UI if already prompted', async () => {
        const testPath = join(testOutputDir, 'test_project1');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');

        jest.spyOn(appWizardCache, 'getFromCache')
            .mockImplementationOnce(() => {
                return {
                    isAbapCloud: jest.fn().mockReturnValue(true)
                } as unknown as AbapServiceProvider;
            })
            .mockImplementationOnce(() => true);

        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                loggerMock,
                launchAsSubGen: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();
        expect(getCredentialsPromptsSpy).toHaveBeenCalled();
    });

    it('should generate FLP configuration successfully - VS Code', async () => {
        const testPath = join(testOutputDir, 'test_project2');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                url: 'https://testUrl',
                client: '000'
            }
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(false);
        const sendTelemetrySpy = jest.spyOn(fioriGenShared, 'sendTelemetry').mockRejectedValueOnce(new Error('Error'));

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchAsSubGen: true
            })
            .withPrompts(answers);

        await expect(runContext.run()).resolves.not.toThrow();
        const variant = fs.readFileSync(join(testProjectPath, 'webapp', 'manifest.appdescr_variant'), {
            encoding: 'utf8'
        });
        const i18n = fs.readFileSync(join(testProjectPath, 'webapp', 'i18n', 'i18n.properties'), {
            encoding: 'utf8'
        });
        expect(variant).toMatchSnapshot();
        expect(i18n).toMatchSnapshot();
        expect(sendTelemetrySpy).toHaveBeenCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).not.toHaveBeenCalled();
    });

    it('Should throw an error if writing phase fails', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling, 'generateInboundConfig').mockRejectedValueOnce(new Error('Error'));
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.updatingApp'));
    });

    it('Should result in an error message if the project is a CF project', async () => {
        jest.spyOn(adpTooling, 'isCFEnvironment').mockReturnValueOnce(true);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await initI18n();
        await runContext.run();
        expect(vsCodeMessageSpy).toHaveBeenCalledWith(t('error.projectNotSupported'));
    });

    it('Should result in an error message if the project is a CF project and use the logger in case of CLI', async () => {
        jest.spyOn(adpTooling, 'isCFEnvironment').mockReturnValueOnce(true);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(fioriGenShared, 'isCli').mockReturnValueOnce(true);
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await initI18n();
        await runContext.run();
        expect(toolsLoggerErrorSpy).toHaveBeenCalledWith(t('error.projectNotSupported'));
    });

    it('Should result in an error message if the project is not a CloudReady project', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        jest.spyOn(sysAccess, 'createAbapServiceProvider').mockResolvedValueOnce({
            isAbapCloud: jest.fn().mockReturnValueOnce(false)
        } as unknown as AbapServiceProvider);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await initI18n();
        await runContext.run();
        expect(vsCodeMessageSpy).toHaveBeenCalledWith(t('error.projectNotCloudReady'));
    });

    it('Should throw an error when no destination is configured in Application Studio', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {} as unknown as sysAccess.AbapTarget
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds').mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 401
            }
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await runContext.run();
        expect(vsCodeMessageSpy).toHaveBeenCalledWith(t('error.destinationNotFound'));
    });

    it('Should throw an error when url is not configured configured in system store', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                url: 'https://testUrl'
            } as unknown as sysAccess.AbapTarget
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds').mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 401
            }
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(false);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await runContext.run();
        expect(vsCodeMessageSpy).toHaveBeenCalledWith(t('error.systemNotFoundInStore'));
    });

    it('Should throw an error when fetching inbounds', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                url: 'https://testUrl'
            }
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds').mockRejectedValueOnce(new Error('Error'));
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(false);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.baseAppInboundsFetching'));
    });

    it('Should require authentication if fetching base app inbounds returns 401 and fail after authentication', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const getBaseAppInboundsMock = jest
            .spyOn(adpTooling, 'getBaseAppInbounds')
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: {
                    status: 401
                }
            })
            .mockRejectedValueOnce(new Error('Error'));
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');
        jest.spyOn(inquirerCommon, 'getCredentialsPrompts').mockImplementationOnce(
            async (
                callback?: inquirerCommon.AdditionalValidation
            ): Promise<inquirerCommon.YUIQuestion<inquirerCommon.CredentialsAnswers>[]> => {
                await callback?.({ username: 'testUsername', password: 'testPassword' });
                return Promise.resolve([
                    {
                        username: 'testUsername'
                    } as unknown as inquirerCommon.InputQuestion,
                    {
                        password: 'testPassword'
                    } as unknown as inquirerCommon.PasswordQuestion
                ]);
            }
        );

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        // getBaseAppInboundsMock.mockClear();
        await expect(runContext.run()).rejects.toThrow(t('error.baseAppInboundsFetching'));
        expect(getBaseAppInboundsMock).toHaveBeenCalledTimes(2);
    });

    it('Should require authentication again if credentials are wrong', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds')
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: {
                    status: 401
                }
            })
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: {
                    status: 401
                }
            });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');
        let callbackResult: string = '';
        jest.spyOn(inquirerCommon, 'getCredentialsPrompts').mockImplementationOnce(
            async (
                callback?: inquirerCommon.AdditionalValidation
            ): Promise<inquirerCommon.YUIQuestion<inquirerCommon.CredentialsAnswers>[]> => {
                callbackResult = (await callback?.({ username: 'testUsername', password: 'testPassword' })) as string;
                return Promise.resolve([
                    {
                        username: 'testUsername'
                    } as unknown as inquirerCommon.InputQuestion,
                    {
                        password: 'testPassword'
                    } as unknown as inquirerCommon.PasswordQuestion
                ]);
            }
        );

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await runContext.run();
        await initI18n();
        expect(callbackResult).toEqual(t('error.authenticationFailed'));
    });

    it('Should show error message after authetication when base app inbounds request fails with connection error', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds')
            .mockRejectedValueOnce({
                isAxiosError: true,
                response: {
                    status: 401
                }
            })
            .mockRejectedValueOnce({
                isAxiosError: true,
                message: 'Network Error'
            });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');
        let callbackResult: string = '';
        jest.spyOn(inquirerCommon, 'getCredentialsPrompts').mockImplementationOnce(
            async (
                callback?: inquirerCommon.AdditionalValidation
            ): Promise<inquirerCommon.YUIQuestion<inquirerCommon.CredentialsAnswers>[]> => {
                callbackResult = (await callback?.({ username: 'testUsername', password: 'testPassword' })) as string;
                return Promise.resolve([
                    {
                        username: 'testUsername'
                    } as unknown as inquirerCommon.InputQuestion,
                    {
                        password: 'testPassword'
                    } as unknown as inquirerCommon.PasswordQuestion
                ]);
            }
        );

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await runContext.run();
        expect(callbackResult).toEqual('Network Error');
    });

    it('Should pass authentication successfully', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds').mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 401
            }
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');
        let callbackResult: string = '';
        jest.spyOn(inquirerCommon, 'getCredentialsPrompts').mockImplementationOnce(
            async (
                callback?: inquirerCommon.AdditionalValidation
            ): Promise<inquirerCommon.YUIQuestion<inquirerCommon.CredentialsAnswers>[]> => {
                callbackResult = (await callback?.({ username: 'testUsername', password: 'testPassword' })) as string;
                return Promise.resolve([
                    {
                        username: 'testUsername'
                    } as unknown as inquirerCommon.InputQuestion,
                    {
                        password: 'testPassword'
                    } as unknown as inquirerCommon.PasswordQuestion
                ]);
            }
        );

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await runContext.run();
        expect(callbackResult).toEqual(true);
    });

    it('Should fail fetching base app inbounds with network error', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling, 'getBaseAppInbounds').mockRejectedValueOnce({
            isAxiosError: true,
            message: 'Network Error'
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        const testProjectPath = join(__dirname, 'fixtures/app.variant1');
        let callbackResult: string = '';
        jest.spyOn(inquirerCommon, 'getCredentialsPrompts').mockImplementationOnce(
            async (
                callback?: inquirerCommon.AdditionalValidation
            ): Promise<inquirerCommon.YUIQuestion<inquirerCommon.CredentialsAnswers>[]> => {
                callbackResult = (await callback?.({ username: 'testUsername', password: 'testPassword' })) as string;
                return Promise.resolve([
                    {
                        username: 'testUsername'
                    } as unknown as inquirerCommon.InputQuestion,
                    {
                        password: 'testPassword'
                    } as unknown as inquirerCommon.PasswordQuestion
                ]);
            }
        );

        const runContext = yeomanTest
            .create(
                adpFlpConfigGenerator,
                {
                    resolved: generatorPath
                },
                {
                    cwd: testProjectPath
                }
            )
            .withOptions({
                vscode,
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await runContext.run();
        expect(vsCodeMessageSpy).toHaveBeenCalledWith('Network Error');
    });
});
