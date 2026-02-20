import yeomanTest from 'yeoman-test';
import '@sap-ux/jest-file-matchers';
import 'jest-extended';
import ServiceGenerator from '../src/app';
import { join } from 'node:path';

//import * as validators from '../src/utils/validators';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { PromptOptions } from '../src/app/types';
import type { SystemSelectionAnswers } from '@sap-ux/ui-service-inquirer';
import { ObjectType } from '@sap-ux/ui-service-inquirer';
import Environment from 'yeoman-environment';
import * as utils from '../src/app/utils';
import * as UiServiceInquirer from '@sap-ux/ui-service-inquirer';

const mockIsAppStudio = jest.fn();
jest.setTimeout(30000);
jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as object),
        isAppStudio: () => mockIsAppStudio()
    };
});
jest.mock('@sap-ux/system-access', () => {
    return {
        ...(jest.requireActual('@sap-ux/system-access') as object),
        createAbapServiceProvider: jest.fn().mockResolvedValue({
            get: jest.fn(),
            getUiServiceGenerator: jest.fn().mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
        })
    };
});
const mockSendTelemetry = jest.fn().mockResolvedValue({});
jest.mock('@sap-ux/fiori-generator-shared', () => ({
    ...(jest.requireActual('@sap-ux/fiori-generator-shared') as {}),
    sendTelemetry: () => mockSendTelemetry(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn(),
        markAppGenStartTime: jest.fn()
    }
}));

const serviceGenPath = join(__dirname, '../src/app');
const businessObjectName = 'I_BANKTP';

describe('BAS service center', () => {
    beforeEach(() => {
        const inquirerSpy = jest.spyOn(UiServiceInquirer, 'getSystemSelectionPrompts').mockResolvedValue({
            prompts: [
                {
                    type: 'list',
                    name: 'systemSelection',
                    message: 'Select a system',
                    choices: [
                        { name: 'system1', value: 'system1' },
                        { name: 'system2', value: 'system2' },
                        { name: 'system3', value: 'system3' }
                    ]
                }
            ] as any,
            answers: {
                connectedSystem: {
                    backendSystem: {
                        name: 'system1'
                    },
                    destination: {
                        Name: 'system1'
                    },
                    serviceProvider: {
                        get: jest.fn(),
                        getUiServiceGenerator: jest
                            .fn()
                            .mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
                    }
                },
                objectGenerator: { generate: jest.fn().mockResolvedValue({}) }
            } as any
        });
    });

    test('authentication type passed to validator', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        mockIsAppStudio.mockReturnValue(true);
        const authenicationSpy = jest.spyOn(utils, 'authenticateInputData');
        //const validateConnectionSpy = jest.spyOn(utils, 'validateConnection');

        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    systemSelection: 'system3',
                    objectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({
                    appWizard,
                    data: {
                        id: businessObjectName,
                        systemName: 'system3',
                        businessObject: businessObjectName,
                        user: 'user',
                        password: 'password'
                    }
                })
        ).resolves.not.toThrow();
        expect(authenicationSpy).toHaveBeenCalled();
        //expect(validateConnectionSpy).toHaveBeenCalled();
        // expect(validateConnectionSpy).toHaveBeenCalledWith(
        //     'system3',
        //     expect.toBeObject(),
        //     expect.objectContaining({ username: 'user', password: 'password' })
        // );
    });

    test('BAS service center options', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const authenicationSpy = jest.spyOn(utils, 'authenticateInputData');
        const validateConnectionSpy = jest
            .spyOn(utils, 'validateConnection')
            .mockImplementation((systemName, system, reqAuth) => {
                Object.assign(system, {
                    connectedSystem: {
                        serviceProvider: {
                            get: jest.fn(),
                            getUiServiceGenerator: jest
                                .fn()
                                .mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
                        },
                        destination: {
                            Name: systemName
                        }
                    }
                });
                return Promise.resolve();
            });
        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    ObjectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({
                    appWizard,
                    data: {
                        systemName: 'system1',
                        businessObject: businessObjectName,
                        user: 'user',
                        password: 'password'
                    }
                })
        ).resolves.not.toThrow();
        expect(authenicationSpy).toHaveBeenCalledWith(
            expect.objectContaining({ user: 'user', password: 'password' }),
            expect.objectContaining({})
        );
        // expect(validateConnectionSpy).toHaveBeenCalledWith(
        //     'system1',
        //     expect.toBeObject(),
        //     expect.objectContaining({ username: 'user', password: 'password' })
        // );
    });

    test('BAS service center options - state is updated correctly during connection validation', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const authenicationSpy = jest
            .spyOn(utils, 'authenticateInputData')
            .mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
                //state.authenticated = true;
                Object.assign(system, {
                    connectedSystem: {
                        serviceProvider: {
                            get: jest.fn(),
                            getUiServiceGenerator: jest
                                .fn()
                                .mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
                        },
                        destination: {
                            Name: 'system1'
                        }
                    }
                });
                return Promise.resolve();
            });
        const validateConnectionSpy = jest.spyOn(utils, 'validateConnection').mockResolvedValue();

        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    ObjectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({
                    appWizard,
                    data: {
                        systemName: 'system1',
                        businessObject: 'testBusinessObject',
                        user: 'user',
                        password: 'password'
                    }
                })
                .then((result: any) => {
                    //console.log(JSON.stringify(result.generator.serviceConfigAnswers));
                    expect(result.generator.systemSelectionAnswers.connectedSystem.destination.Name).toEqual('system1');
                    expect(result.generator.systemSelectionAnswers.objectGenerator).toBeDefined();
                })
        ).resolves.not.toThrow();
    });

    test('generateService - should write BAS service metadata file', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const generateSpy = jest.spyOn(utils, 'generateService').mockResolvedValue({
            objectReference: {
                type: 'test',
                uri: '/test/uri/from/generate'
            }
        });
        const testOutputDir = join(__dirname, '../test-output');
        const providerSystemMock = {
            name: 'testSystem',
            url: 'http://testsystem:44300',
            dataType: 1,
            proxyType: 2,
            authenticationType: 'BasicAuthentication',
            product: 'S/4 HANA',
            description: 'test system'
        } as any;
        const inputData = {
            systemName: 'testSystem',
            businessObject: businessObjectName,
            path: testOutputDir,
            providerSystem: providerSystemMock
        };
        const writeBASMetadataSpy = jest.spyOn(utils, 'writeBASMetadata').mockResolvedValue();
        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    ObjectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({ appWizard, data: inputData })
        ).resolves.not.toThrow();
        expect(generateSpy).toHaveBeenCalled();
        expect(writeBASMetadataSpy).toHaveBeenCalled();
    });

    test('generateService - should NOT write BAS service metadata file', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const generateSpy = jest.spyOn(utils, 'generateService').mockResolvedValue({
            objectReference: {
                type: 'test',
                uri: '/test/uri/from/generate'
            }
        });
        const inputData = {
            systemName: 'testSystem',
            businessObject: businessObjectName
        };
        const writeBASMetadataSpy = jest.spyOn(utils, 'writeBASMetadata').mockResolvedValue();
        const runPostGenHookSpy = jest.spyOn(utils, 'runPostGenHook').mockImplementation();
        const state = {
            service: {
                serviceBindingName: '',
                serviceType: '',
                uri: ''
            },
            systemName: 'system1',
            authenticated: undefined,
            packageInputChoiceValid: true,
            morePackageResultsMsg: '',
            newTransportNumber: '',
            transportList: [],
            content: '',
            suggestedServiceName: ''
        };
        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    ObjectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test',
                    launchAppGen: true
                })
                .withOptions({ appWizard, data: inputData, vscode: {}, state })
        ).resolves.not.toThrow();
        expect(generateSpy).toHaveBeenCalled();
        expect(appWizard.showInformation).toHaveBeenCalledWith('The UI service:  was generated.', 1);
        expect(runPostGenHookSpy).toHaveBeenCalled();
    });

    test('BAS service center - new interface with id and type BO', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const authenicationSpy = jest
            .spyOn(utils, 'authenticateInputData')
            .mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
                //state.authenticated = true;
                Object.assign(system, {
                    connectedSystem: {
                        serviceProvider: {
                            getUiServiceGenerator: jest.fn().mockResolvedValue({
                                generate: jest.fn().mockResolvedValue({})
                            })
                        }
                    }
                });
                // helper.PromptState.provider = {
                //     getUiServiceGenerator: jest.fn().mockResolvedValue({
                //         generate: jest.fn().mockResolvedValue({})
                //     })
                // } as any;
                return Promise.resolve();
            });
        const validateConnectionSpy = jest.spyOn(utils, 'validateConnection').mockResolvedValue();

        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    ObjectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({
                    appWizard,
                    data: {
                        systemName: 'system1',
                        id: businessObjectName,
                        type: 'BO INTERFACE'
                    }
                })
                .then((result: any) => {
                    expect(result.generator.systemSelectionAnswers.objectGenerator).toBeDefined();
                })
        ).resolves.not.toThrow();
    });

    test('BAS service center - new interface with id and type CDS', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const authenicationSpy = jest
            .spyOn(utils, 'authenticateInputData')
            .mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
                //state.authenticated = true;
                Object.assign(system, {
                    connectedSystem: {
                        serviceProvider: {
                            getUiServiceGenerator: jest.fn().mockResolvedValue({
                                generate: jest.fn().mockResolvedValue({})
                            })
                        }
                    }
                });
                // helper.PromptState.provider = {
                //     getUiServiceGenerator: jest.fn().mockResolvedValue({
                //         generate: jest.fn().mockResolvedValue({})
                //     })
                // } as any;
                return Promise.resolve();
            });
        const validateConnectionSpy = jest.spyOn(utils, 'validateConnection').mockResolvedValue();

        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    ObjectType: ObjectType.CDS_VIEW,
                    businessObjectInterface: 'C_GRANTORCLAIMITEMDEX',
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({
                    appWizard,
                    data: {
                        systemName: 'system1',
                        id: 'C_GRANTORCLAIMITEMDEX',
                        type: 'CDS VIEW'
                    }
                })
                .then((result: any) => {
                    expect(result.generator.systemSelectionAnswers.objectGenerator).toBeDefined();
                })
        ).resolves.not.toThrow();
    });
});

describe('test ui service generator', () => {
    beforeEach(() => {
        const inquirerSpy = jest.spyOn(UiServiceInquirer, 'getSystemSelectionPrompts').mockResolvedValue({
            prompts: [
                {
                    type: 'list',
                    name: 'systemSelection',
                    message: 'Select a system',
                    choices: [
                        { name: 'system1', value: 'system1' },
                        { name: 'system2', value: 'system2' },
                        { name: 'system3', value: 'system3' }
                    ]
                }
            ] as any,
            answers: {
                connectedSystem: {
                    backendSystem: {
                        name: 'system1'
                    },
                    destination: {
                        Name: 'system1'
                    },
                    serviceProvider: {
                        get: jest.fn(),
                        getUiServiceGenerator: jest
                            .fn()
                            .mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
                    }
                },
                objectGenerator: { generate: jest.fn().mockResolvedValue({}) }
            } as any
        });
    });
    test('UI Service generator', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        const generateSpy = jest.spyOn(utils, 'generateService');
        await expect(
            yeomanTest
                .create(ServiceGenerator, { resolved: serviceGenPath }, {})
                .cd('.')
                .withPrompts({
                    systemSelection: 'system1',
                    objectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({ appWizard })
                .run()
        ).resolves.not.toThrow();
        expect(generateSpy).toHaveBeenCalled();
    });

    test('Shows warning for no generator found', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn()
        };

        const authenicationSpy = jest
            .spyOn(utils, 'authenticateInputData')
            .mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
                //state.authenticated = true;
                Object.assign(system, {
                    connectedSystem: {
                        destination: {
                            Name: 'system1'
                        },
                        serviceProvider: {
                            get: jest.fn(),
                            getUiServiceGenerator: jest.fn().mockResolvedValue(undefined)
                        }
                    }
                });
                return Promise.resolve();
            });

        const env = Environment.createEnv();
        await expect(
            yeomanTest
                .run(ServiceGenerator, { resolved: serviceGenPath })
                .cd('.')
                .withPrompts({
                    sapSystem: 'system1',
                    objectType: ObjectType.BUSINESS_OBJECT,
                    businessObjectInterface: businessObjectName,
                    packageInputChoice: 'EnterManualChoice',
                    packageManual: 'package',
                    transportInputChoice: 'EnterManualChoice',
                    transportManual: 'transport',
                    draftEnabled: true,
                    serviceName: 'service',
                    generating: 'test'
                })
                .withOptions({
                    appWizard,
                    data: {
                        systemName: 'testSystem',
                        businessObject: 'testBusinessObject'
                    }
                })
                .then((result: any) => {
                    expect(result.env.conflicter.force).toBe(true);
                })
        ).rejects.toThrow();
        expect(appWizard.showError).toHaveBeenCalledWith(
            'No generator found for the selected business object interface.',
            0
        );
        expect(authenicationSpy).toHaveBeenCalled();
    });
});
