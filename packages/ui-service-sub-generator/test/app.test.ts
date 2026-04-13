import { jest } from '@jest/globals';
import yeomanTest from 'yeoman-test';
import '@sap-ux/jest-file-matchers';
import 'jest-extended';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __testdirname = dirname(fileURLToPath(import.meta.url));

import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { PromptOptions } from '../src/app/types';
import type { SystemSelectionAnswers } from '@sap-ux/ui-service-inquirer';

// ── Top-level mock functions ──────────────────────────────────────────────

const mockIsAppStudio = jest.fn();

// UiServiceInquirer mocks
const mockGetSystemSelectionPrompts = jest.fn<any>();
const mockGetConfigPrompts = jest.fn<any>();

// utils mocks
const mockAuthenticateInputData = jest.fn<any>();
const mockValidateConnection = jest.fn<any>();
const mockGenerateService = jest.fn<any>();
const mockWriteBASMetadata = jest.fn<any>();
const mockRunPostGenHook = jest.fn<any>();
const mockGetAppGenSystemData = jest.fn<any>();
const mockSetToolbarMessage = jest.fn<any>();
const mockAddToCache = jest.fn<any>();
const mockGetFromCache = jest.fn<any>().mockReturnValue([{}, '']);
const mockCheckConnection = jest.fn<any>();
const mockGetRelativeUrlFromContent = jest.fn<any>();
const mockGetMetadata = jest.fn<any>();
const mockGetServiceMedadataContent = jest.fn<any>();

const mockSendTelemetry = jest.fn().mockResolvedValue({});

// ── Module mocks (BEFORE dynamic imports) ─────────────────────────────────

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    isAppStudio: () => mockIsAppStudio(),
    listDestinations: jest.fn(),
    getDisplayName: jest.fn(),
    WebIDEUsage: {},
    WebIDEAdditionalData: {}
}));

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    createAbapServiceProvider: jest.fn().mockResolvedValue({
        get: jest.fn(),
        getUiServiceGenerator: jest.fn().mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
    }),
    isUrlTarget: jest.fn(),
    getCredentialsWithPrompts: jest.fn()
}));

const mockDefaultLogger = {
    fatal: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    getChildLogger: jest.fn(),
    getLogLevel: jest.fn().mockReturnValue('off'),
    log: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    transports: jest.fn().mockReturnValue([]),
    child: jest.fn()
};
mockDefaultLogger.getChildLogger.mockReturnValue(mockDefaultLogger);
mockDefaultLogger.child.mockReturnValue(mockDefaultLogger);

jest.unstable_mockModule('@sap-ux/fiori-generator-shared', () => ({
    sendTelemetry: () => mockSendTelemetry(),
    TelemetryHelper: {
        initTelemetrySettings: jest.fn(),
        createTelemetryData: jest.fn(),
        markAppGenStartTime: jest.fn(),
        telemetryData: {}
    },
    DefaultLogger: mockDefaultLogger,
    LogWrapper: class {
        info = jest.fn();
        warn = jest.fn();
        error = jest.fn();
        debug = jest.fn();
        trace = jest.fn();
        fatal = jest.fn();
        getChildLogger = jest.fn().mockReturnValue(mockDefaultLogger);
        getLogLevel = jest.fn().mockReturnValue('off');
        log = jest.fn();
        add = jest.fn();
        remove = jest.fn();
        transports = jest.fn().mockReturnValue([]);
        child = jest.fn().mockReturnValue(mockDefaultLogger);
    },
    setYeomanEnvConflicterForce: jest.fn()
}));

jest.unstable_mockModule('@sap-ux/ui-service-inquirer', () => ({
    getSystemSelectionPrompts: mockGetSystemSelectionPrompts,
    getConfigPrompts: mockGetConfigPrompts,
    ObjectType: {
        BUSINESS_OBJECT: 'BusinessObject',
        CDS_VIEW: 'CDSView'
    }
}));

const realUtils = await import('../src/app/utils');

jest.unstable_mockModule('../src/app/utils', () => ({
    ...realUtils,
    authenticateInputData: mockAuthenticateInputData,
    validateConnection: mockValidateConnection,
    generateService: mockGenerateService,
    writeBASMetadata: mockWriteBASMetadata,
    runPostGenHook: mockRunPostGenHook,
    getAppGenSystemData: mockGetAppGenSystemData,
    addToCache: mockAddToCache,
    getFromCache: mockGetFromCache
}));

// ── Dynamic imports (AFTER mocks) ─────────────────────────────────────────

const { default: ServiceGenerator } = await import('../src/app');
const { ObjectType } = await import('@sap-ux/ui-service-inquirer');

// ── Test setup ────────────────────────────────────────────────────────────

const serviceGenPath = join(__testdirname, '../src/app');
const businessObjectName = 'I_BANKTP';

jest.setTimeout(30000);

function setupDefaultSystemSelectionPrompts(): void {
    mockGetSystemSelectionPrompts.mockResolvedValue({
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
                    getUiServiceGenerator: jest.fn().mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
                }
            },
            objectGenerator: { generate: jest.fn().mockResolvedValue({}) }
        } as any
    });
}

function setupDefaultConfigPrompts(): void {
    mockGetConfigPrompts.mockReturnValue({
        prompts: [
            {
                type: 'confirm',
                name: 'launchAppGen',
                message: 'Launch App Gen?',
                default: false
            }
        ],
        answers: {
            content: '',
            serviceName: '',
            showDraftEnabled: false
        }
    });
}

describe('BAS service center', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupDefaultSystemSelectionPrompts();
        setupDefaultConfigPrompts();
        // Default authenticateInputData populates connectedSystem like the real implementation
        mockAuthenticateInputData.mockImplementation(async (_data: any, system: any) => {
            await mockValidateConnection(_data.systemName, system, undefined);
        });
        mockValidateConnection.mockImplementation(async (systemName: string, system: any) => {
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
        });
        mockGenerateService.mockResolvedValue(undefined);
        mockWriteBASMetadata.mockResolvedValue(undefined);
        mockRunPostGenHook.mockResolvedValue(undefined);
        mockGetAppGenSystemData.mockReturnValue({});
        mockGetFromCache.mockReturnValue([{}, '']);
    });

    test('authentication type passed to validator', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        mockIsAppStudio.mockReturnValue(true);

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
        expect(mockAuthenticateInputData).toHaveBeenCalled();
    });

    test('BAS service center options', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        mockValidateConnection.mockImplementation((systemName: string, system: any, reqAuth: any) => {
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
        expect(mockAuthenticateInputData).toHaveBeenCalledWith(
            expect.objectContaining({ user: 'user', password: 'password' }),
            expect.objectContaining({})
        );
    });

    test('BAS service center options - state is updated correctly during connection validation', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        mockAuthenticateInputData.mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
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

        mockGenerateService.mockResolvedValue({
            objectReference: {
                type: 'test',
                uri: '/test/uri/from/generate'
            }
        });
        const testOutputDir = join(__testdirname, '../test-output');
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
        expect(mockGenerateService).toHaveBeenCalled();
        expect(mockWriteBASMetadata).toHaveBeenCalled();
    });

    test('generateService - should NOT write BAS service metadata file', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        mockGenerateService.mockResolvedValue({
            objectReference: {
                type: 'test',
                uri: '/test/uri/from/generate'
            }
        });
        const inputData = {
            systemName: 'testSystem',
            businessObject: businessObjectName
        };
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
        expect(mockGenerateService).toHaveBeenCalled();
        expect(appWizard.showInformation).toHaveBeenCalledWith('The UI service:  was generated.', 1);
        expect(mockRunPostGenHook).toHaveBeenCalled();
    });

    test('BAS service center - new interface with id and type BO', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

        mockAuthenticateInputData.mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
            Object.assign(system, {
                connectedSystem: {
                    serviceProvider: {
                        getUiServiceGenerator: jest.fn().mockResolvedValue({
                            generate: jest.fn().mockResolvedValue({})
                        })
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

        mockAuthenticateInputData.mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
            Object.assign(system, {
                connectedSystem: {
                    serviceProvider: {
                        getUiServiceGenerator: jest.fn().mockResolvedValue({
                            generate: jest.fn().mockResolvedValue({})
                        })
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
        jest.clearAllMocks();
        setupDefaultSystemSelectionPrompts();
        setupDefaultConfigPrompts();
        mockAuthenticateInputData.mockImplementation(async (_data: any, system: any) => {
            await mockValidateConnection(_data.systemName, system, undefined);
        });
        mockValidateConnection.mockImplementation(async (systemName: string, system: any) => {
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
        });
        mockGenerateService.mockResolvedValue(undefined);
        mockWriteBASMetadata.mockResolvedValue(undefined);
        mockRunPostGenHook.mockResolvedValue(undefined);
        mockGetAppGenSystemData.mockReturnValue({});
        mockGetFromCache.mockReturnValue([{}, '']);
    });

    test('UI Service generator', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn(),
            showInformation: jest.fn()
        };

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
        expect(mockGenerateService).toHaveBeenCalled();
    });

    test('Shows warning for no generator found', async () => {
        const appWizard: Partial<AppWizard> = {
            setHeaderTitle: jest.fn(),
            showWarning: jest.fn(),
            showError: jest.fn()
        };

        mockAuthenticateInputData.mockImplementation((data: PromptOptions, system: SystemSelectionAnswers) => {
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

        // Use real generateService so it throws when objectGenerator is undefined
        mockGenerateService.mockImplementation(realUtils.generateService);

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
        expect(mockAuthenticateInputData).toHaveBeenCalled();
    });
});
