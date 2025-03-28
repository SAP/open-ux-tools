import type { BackendSystem } from '@sap-ux/store';
import type { YUIQuestion, CredentialsAnswers } from '@sap-ux/inquirer-common';
import type { FLPConfigAnswers } from '@sap-ux/flp-config-inquirer';
import type { ToolsLogger } from '@sap-ux/logger';
import { join } from 'path';
import yeomanTest from 'yeoman-test';
import fs from 'fs';
import fsextra from 'fs-extra';
import adpFlpConfigGenerator from '../src/app';
import * as adpTooling from '@sap-ux/adp-tooling';
import * as btpUtils from '@sap-ux/btp-utils';
import * as Logger from '@sap-ux/logger';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import { rimraf } from 'rimraf';
import { EventName } from '../src/telemetryEvents';
import * as sysAccess from '@sap-ux/system-access';
import { t, initI18n } from '../src/utils/i18n';
import { MessageType } from '@sap-devx/yeoman-ui-types';
import * as inquirerCommon from '@sap-ux/inquirer-common';
import * as projectAccess from '@sap-ux/project-access';

const originalCwd = process.cwd();

jest.mock('@sap-ux/system-access');
jest.mock('@sap-ux/btp-utils');
jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    isCFEnvironment: jest.fn(),
    getAdpConfig: jest.fn(),
    generateInboundConfig: jest.fn()
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
    jest.setTimeout(60000);

    jest.spyOn(adpTooling, 'isCFEnvironment').mockReturnValue(false);
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
    let answers:
        | FLPConfigAnswers
        | {
              username: string;
              password: string;
          };

    jest.spyOn(adpTooling.ManifestService, 'initMergedManifest').mockResolvedValue({
        getManifest: jest.fn().mockReturnValue({})
    } as unknown as adpTooling.ManifestService);
    const showInformationSpy = jest.fn();
    const mockAppWizard = {
        setHeaderTitle: jest.fn(),
        showInformation: showInformationSpy
    };
    jest.spyOn(inquirerCommon, 'getCredentialsPrompts').mockResolvedValue(
        credentialsPrompts as unknown as YUIQuestion<CredentialsAnswers>[]
    );
    const vsCodeMessageSpy = jest.fn();
    const vscode = {
        window: {
            showErrorMessage: vsCodeMessageSpy
        }
    };
    jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');

    beforeEach(async () => {
        answers = {
            username: 'testUsername',
            password: 'testPassword',
            semanticObject: 'testSemanticObject',
            emptyInboundsInfo: 'testEmptyInboundsInfo',
            action: 'testAction',
            title: 'testTitle',
            subTitle: 'testSubTitle',
            additionalParameters: 'param1=test1&param2=test2'
        };
    });

    afterEach(() => {
        showInformationSpy.mockReset();
    });

    beforeAll(async () => {
        await initI18n();
        fs.mkdirSync(testOutputDir, { recursive: true });
    });

    afterAll(() => {
        process.chdir(originalCwd); // Generation changes the cwd, this breaks sonar report so we restore later
        rimraf.sync(testOutputDir);
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
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
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
        expect(sendTelemetrySpy).toBeCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).toHaveBeenCalledWith(t('info.flpConfigAdded'), MessageType.notification);
    });

    it('should generate FLP configuration successfully - VS Code', async () => {
        const testPath = join(testOutputDir, 'test_project2');
        fs.mkdirSync(testPath, { recursive: true });
        fsextra.copySync(join(__dirname, 'fixtures/app.variant1'), join(testPath, 'app.variant1'));
        const testProjectPath = join(testPath, 'app.variant1');
        jest.spyOn(sysAccess, 'getCredentialsFromStore').mockResolvedValue({
            name: 'testSystem'
        } as unknown as BackendSystem);
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
        expect(sendTelemetrySpy).toBeCalledWith(
            EventName.ADP_FLP_CONFIG_ADDED,
            expect.objectContaining({
                OperatingSystem: 'testOS',
                Platform: 'testPlatform'
            }),
            testProjectPath
        );
        expect(showInformationSpy).not.toBeCalled();
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
        await expect(runContext.run()).rejects.toThrow(t('error.projectNotSupported'));
    });

    it('Should throw an error when no destination is configured in Application Studio', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {} as unknown as sysAccess.AbapTarget
        });
        jest.spyOn(btpUtils, 'isAppStudio').mockReturnValue(true);
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue({});
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
        expect(vsCodeMessageSpy).toBeCalledWith(t('error.destinationNotFound'));
    });

    it('Should throw an error when no url is configured for target in VS Code', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {} as unknown as sysAccess.AbapTarget
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
        expect(vsCodeMessageSpy).toBeCalledWith(t('error.systemNotFound'));
    });

    it('Should throw an error when system is not found in the store in VS Code', async () => {
        const systemUrl = 'https://testUrl';
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                url: systemUrl
            }
        });
        jest.spyOn(sysAccess, 'getCredentialsFromStore').mockResolvedValueOnce(undefined);
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
        expect(vsCodeMessageSpy).toBeCalledWith(t('error.systemNotFound', { systemUrl }));
    });

    it('Should throw an error when fetching manifest fails', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                url: 'https://testUrl'
            }
        });
        jest.spyOn(adpTooling.ManifestService, 'initMergedManifest').mockRejectedValueOnce(new Error('Error'));
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

        await expect(runContext.run()).rejects.toThrow(t('error.fetchingManifest'));
    });

    it('Should require authentication if manifest fetching returns 401 and fail after authentication', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        const initMergedManifestSpy = jest
            .spyOn(adpTooling.ManifestService, 'initMergedManifest')
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

        initMergedManifestSpy.mockClear();
        await expect(runContext.run()).rejects.toThrow(t('error.fetchingManifest'));
        expect(initMergedManifestSpy).toBeCalledTimes(2);
    });

    it('Should require authentication again if credentials are wrong', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling.ManifestService, 'initMergedManifest')
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

    it('Should show error message after authetication when manifest request fails with connection error', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling.ManifestService, 'initMergedManifest')
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
        jest.spyOn(adpTooling.ManifestService, 'initMergedManifest').mockRejectedValueOnce({
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

    it('Should fail manifest fetching with network error', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue(destinationList);
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                destination: 'testDestination'
            }
        });
        jest.spyOn(adpTooling.ManifestService, 'initMergedManifest').mockRejectedValueOnce({
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
        expect(vsCodeMessageSpy).toBeCalledWith('Network Error');
    });

    it('Should fail if destination is not found in BTP subaccount', async () => {
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue({});
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

        await runContext.run();
        expect(vsCodeMessageSpy).toBeCalledWith(
            t('error.destinationNotFoundInStore', { destination: 'testDestination' })
        );
    });

    it('Should fail if destination is not found in BTP subaccount and log error in CLI', async () => {
        jest.spyOn(fioriGenShared, 'isCli').mockReturnValue(true);
        jest.spyOn(btpUtils, 'listDestinations').mockResolvedValue({});
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

        await runContext.run();
        expect(toolsLoggerErrorSpy).toBeCalledWith(
            t('error.destinationNotFoundInStore', { destination: 'testDestination' })
        );
    });
});
