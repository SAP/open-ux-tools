import type { BackendSystem } from '@sap-ux/store';
import type * as axios from '@sap-ux/axios-extension';
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
import * as odataInquirer from '@sap-ux/odata-service-inquirer';
import * as fioriGenShared from '@sap-ux/fiori-generator-shared';
import { rimraf } from 'rimraf';
import { EventName } from '../src/telemetryEvents';
import * as sysAccess from '@sap-ux/system-access';
import { t } from '../src/utils/i18n';
import { MessageType } from '@sap-devx/yeoman-ui-types';

jest.mock('@sap-ux/system-access');
jest.mock('@sap-ux/btp-utils');
jest.mock('@sap-ux/adp-tooling', () => ({
    ...jest.requireActual('@sap-ux/adp-tooling'),
    isCFEnvironment: jest.fn(),
    getAdpConfig: jest.fn(),
    generateInboundConfig: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
    logger: {
        error: jest.fn()
    }
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
    getHostEnvironment: jest.fn()
}));

const sendTelemetrySpy = fioriGenShared.sendTelemetry as jest.Mock;

const loggerMock: ToolsLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
} as Partial<ToolsLogger> as ToolsLogger;
jest.spyOn(Logger, 'ToolsLogger').mockImplementation(() => loggerMock);

describe('FLPConfigGenerator Integration Tests', () => {
    jest.setTimeout(100000);
    jest.spyOn(adpTooling, 'isCFEnvironment').mockReturnValue(false);

    const generatorPath = join(__dirname, '../../src/app/index.ts');
    const testOutputDir = join(__dirname, 'test-output');
    const systemSelectionPrompts = {
        prompts: [
            {
                name: 'systemSelection'
            },
            {
                name: 'systemUsername'
            },
            {
                name: 'systemPassword'
            }
        ],
        answers: {
            connectedSystem: {
                serviceProvider: {} as axios.ServiceProvider
            }
        }
    };
    let answers:
        | FLPConfigAnswers
        | {
              systemSelection: string;
              systemUsername: string;
              systemPassword: string;
          };

    jest.spyOn(adpTooling.ManifestService, 'initMergedManifest').mockResolvedValue({
        getManifest: jest.fn().mockReturnValue({})
    } as unknown as adpTooling.ManifestService);
    const showInformationSpy = jest.fn();
    const mockAppWizard = {
        setHeaderTitle: jest.fn(),
        showInformation: showInformationSpy
    };
    jest.spyOn(odataInquirer, 'getSystemSelectionQuestions').mockResolvedValue(systemSelectionPrompts);

    beforeEach(() => {
        answers = {
            systemSelection: 'testSystem',
            systemUsername: 'testUsername',
            systemPassword: 'testPassword',
            semanticObject: 'testSemanticObject',
            emptyInboundsInfo: 'testEmptyInboundsInfo',
            action: 'testAction',
            title: 'testTitle',
            subTitle: 'testSubTitle',
            additionalParameters: 'param1=test1&param2=test2'
        };
    });

    beforeAll(() => {
        fs.mkdirSync(testOutputDir, { recursive: true });
    });

    afterAll(() => {
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
        showInformationSpy.mockReset();
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
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.cfNotSupported'));
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
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.updatingApp'));
    });

    it('Should throw an error when no destination is configured in Application Studio', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {} as unknown as sysAccess.AbapTarget
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
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.destinationNotFound'));
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
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.systemNotFound'));
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
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.systemNotFoundInStore', { url: systemUrl }));
    });

    it('Should throw an error when fetching manifest fails', async () => {
        jest.spyOn(adpTooling, 'getAdpConfig').mockResolvedValue({
            target: {
                url: 'https://testUrl'
            }
        });
        jest.spyOn(odataInquirer, 'getSystemSelectionQuestions').mockRejectedValueOnce(new Error('Error'));
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
                appWizard: mockAppWizard,
                launchFlpConfigAsSubGenerator: false
            })
            .withPrompts(answers);

        await expect(runContext.run()).rejects.toThrow(t('error.fetchingManifest'));
    });
});
