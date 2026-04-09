import { jest } from '@jest/globals';
import nock from 'nock';
import type { Answers, Question as YoQuestion } from 'inquirer';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

// Pre-import actual modules before setting up mocks (to avoid missing export errors)
const actualBtpUtils = await import('@sap-ux/btp-utils');
const actualInquirerCommon = await import('@sap-ux/inquirer-common');
const actualSystemAccess = await import('@sap-ux/system-access');
const actualOdataServiceInquirer = await import('@sap-ux/odata-service-inquirer');
const actualTelemetry = await import('@sap-ux/telemetry');
const actualAbapDeployConfigInquirer = await import('@sap-ux/abap-deploy-config-inquirer');

jest.unstable_mockModule('../src/logger-helper', () => ({
    default: {
        logger: {
            warn: jest.fn(),
            error: jest.fn()
        }
    }
}));

const mockIsAppStudio = jest.fn();
jest.unstable_mockModule('@sap-ux/btp-utils', () => ({
    ...actualBtpUtils,
    isAppStudio: () => mockIsAppStudio()
}));

jest.unstable_mockModule('@sap-ux/inquirer-common', () => ({
    ...actualInquirerCommon,
    setTelemetryClient: () => jest.fn()
}));

jest.unstable_mockModule('@sap-ux/telemetry', () => ({
    ...actualTelemetry,
    ClientFactory: {
        getTelemetryClient: jest.fn().mockResolvedValue({})
    }
}));

jest.unstable_mockModule('@sap-ux/system-access', () => ({
    ...actualSystemAccess,
    createAbapServiceProvider: jest.fn().mockResolvedValue({ get: jest.fn() } as any)
}));

const getSystemSelectionQuestionsMock = jest.fn();
jest.unstable_mockModule('@sap-ux/odata-service-inquirer', () => ({
    ...actualOdataServiceInquirer,
    getSystemSelectionQuestions: (promptOptions: any, isYUI: boolean) =>
        getSystemSelectionQuestionsMock(promptOptions, isYUI)
}));

const mockGetBusinessObjects = jest.fn();
const mockGetAbapCDSViews = jest.fn();

// Import actual prompt-helper BEFORE mocking (for functions we want to keep real)
const actualPromptHelperModule = await import('../src/prompts/prompt-helper');

jest.unstable_mockModule('../src/prompts/prompt-helper', () => ({
    ...actualPromptHelperModule,
    getBusinessObjects: mockGetBusinessObjects,
    getAbapCDSViews: mockGetAbapCDSViews
}));

const mockGetTransportRequestPrompts = jest.fn().mockImplementation(
    actualAbapDeployConfigInquirer.getTransportRequestPrompts
);
jest.unstable_mockModule('@sap-ux/abap-deploy-config-inquirer', () => ({
    ...actualAbapDeployConfigInquirer,
    getTransportRequestPrompts: mockGetTransportRequestPrompts
}));

const { getSystemSelectionPrompts, getConfigPrompts } = await import('../src');
const { PromptState } = await import('../src/prompts/prompt-state');
const { ObjectType } = await import('../src/types');
const { initI18n, t } = await import('../src/i18n');

interface Question extends YoQuestion {
    when?: (answers: Answers) => boolean | Promise<boolean>;
    message?: (answers?: Answers) => string;
    choices?: () => string[];
    source?: (answers: Answers, input: string) => string[];
    additionalInfo?: () => string;
}

getSystemSelectionQuestionsMock.mockResolvedValue({
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
    ],
    answers: {
        connectedSystem: {
            backendSystem: {
                name: 'system1'
            },
            destination: {
                name: 'system1'
            },
            serviceProvider: {
                getUiServiceGenerator: {
                    generate: jest.fn()
                }
            } as unknown as AbapServiceProvider
        }
    }
});

const answersMock = {
    systemSelection: 'system1',
    transport: 'transport1',
    serviceConfig: 'serviceConfig1',
    packageInputChoice: 'manualInput'
};

const getContentMock = jest.fn().mockImplementation((pckg) => {
    const serviceName = pckg === '' ? '' : 'serviceName';
    return Promise.resolve(
        JSON.stringify({
            businessService: {
                serviceBinding: {
                    serviceBindingName: serviceName
                }
            },
            businessObject: {
                projectionBehavior: {
                    withDraft: undefined
                }
            }
        })
    );
});

const getContentMockDraftTrue = jest.fn().mockImplementation((pckg) => {
    const serviceName = pckg === '' ? '' : 'serviceName';
    return Promise.resolve(
        JSON.stringify({
            businessService: {
                serviceBinding: {
                    serviceBindingName: serviceName
                }
            },
            businessObject: {
                projectionBehavior: {
                    withDraft: true
                }
            }
        })
    );
});

describe('getSystemQuestions', () => {
    beforeAll(async () => {
        await initI18n();
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    let questions;
    let q: { [key: string]: Question } = {};

    test('getSystemQuestions', async () => {
        const businessObjectMockResp = {
            name: 'I_BANKTP',
            value: {
                name: 'I_BANKTP',
                description: 'Banking',
                uri: '/sap/bc/adt/bo/behaviordefinitions/I_BANKTP'
            }
        };

        const abapCDSViewsMockResp = {
            name: 'C_GRANTORCLAIMITEMDEX',
            value: {
                name: 'C_GRANTORCLAIMITEMDEX',
                description: 'Grant Claim Item',
                uri: '/sap/bc/adt/ddic/ddl/sources/C_GRANTORCLAIMITEMDEX'
            }
        };

        mockGetBusinessObjects.mockResolvedValue([businessObjectMockResp]);
        mockGetAbapCDSViews.mockResolvedValue([abapCDSViewsMockResp]);
        questions = (await getSystemSelectionPrompts()).prompts;

        expect(getSystemSelectionQuestionsMock).toHaveBeenCalledWith(
            {
                serviceSelection: { hide: true },
                systemSelection: {
                    defaultChoice: undefined,
                    destinationFilters: {
                        odata_abap: true
                    },
                    hideNewSystem: true
                }
            },
            true
        );

        questions.forEach((question: any) => {
            q[question.name] = question as Question;
        });
        expect(questions).toMatchSnapshot();

        expect(q.objectType.when!({ systemSelection: 'system1' })).toEqual(true);
        expect(q.objectType.choices!()).toEqual([
            { name: t('prompts.businessObjectInterfaceLabel'), value: ObjectType.BUSINESS_OBJECT },
            { name: t('prompts.abapCdsServiceLabel'), value: ObjectType.CDS_VIEW }
        ]);

        const businessObjectMock = {
            name: 'I_BANKTP',
            description: 'Banking',
            uri: '/sap/bc/adt/bo/behaviordefinitions/I_BANKTP'
        };

        const abapCDSViewMock = {
            name: 'C_GRANTORCLAIMITEMDEX',
            description: 'Grant Claim Item',
            uri: '/sap/bc/adt/ddic/ddl/sources/C_GRANTORCLAIMITEMDEX'
        };
        expect(await q.businessObjectInterface.when!({ objectType: ObjectType.BUSINESS_OBJECT })).toEqual(true);
        expect(await q.businessObjectInterface.when!({ objectType: ObjectType.CDS_VIEW })).toEqual(false);
        expect(await q.businessObjectInterface.choices!()).toEqual([businessObjectMockResp]);
        expect(await q.businessObjectInterface.validate!(businessObjectMock, answersMock)).toEqual(
            t('error.noGeneratorFoundBo')
        );

        expect(await q.abapCDSView.when!({ objectType: ObjectType.CDS_VIEW })).toEqual(true);
        expect(await q.abapCDSView.choices!()).toEqual([abapCDSViewsMockResp]);
        expect(await q.abapCDSView.validate!(abapCDSViewMock, answersMock)).toEqual(
            t('error.noGeneratorFoundCdsService')
        );

        mockIsAppStudio.mockReturnValue(false);
        questions = (await getSystemSelectionPrompts()).prompts;
        questions.forEach((question: any) => {
            q[question.name] = question as Question;
        });
    });

    test('getServiceConfigQuestions', async () => {
        const genMock = {
            getContent: getContentMockDraftTrue,
            validateContent: jest.fn().mockResolvedValue({
                severity: 'OK'
            })
        } as any;
        const systemSelectionAnswers = {
            connectedSystem: {
                backendSystem: {
                    url: 'https://mock.sap.system/sap',
                    client: '100'
                },
                destination: {
                    Name: 'system1'
                },
                serviceProvider: {
                    get: jest.fn(),
                    getUiServiceGenerator: jest.fn().mockResolvedValue({ generate: jest.fn().mockResolvedValue({}) })
                }
            },
            objectGenerator: genMock
        } as any;

        questions = getConfigPrompts(systemSelectionAnswers, {
            useDraftEnabled: undefined,
            useLaunchGen: undefined
        }).prompts;
        questions.forEach((question) => {
            q[question.name] = question as Question;
        });
        expect(questions).toMatchSnapshot();
        expect(mockGetTransportRequestPrompts.mock.calls[0][0]).toStrictEqual({
            backendTarget: {
                abapTarget: {
                    url: 'https://mock.sap.system/sap',
                    client: '100'
                },
                serviceProvider: systemSelectionAnswers.connectedSystem.serviceProvider
            },
            transportCreated: {
                description: t('prompts.options.transportDescription')
            },
            transportInputChoice: {
                showCreateDuringDeploy: false
            },
            ui5AbapRepo: {
                default: ''
            }
        });
        expect(q.transportInputChoice.choices!()).toMatchSnapshot();
        expect(await q.serviceName.when!({ packageManual: '', packageAutocomplete: 'package' })).toEqual(true);
        expect(PromptState.serviceConfig.showDraftEnabled).toEqual(true);
        expect(q.serviceName.choices!()).toEqual([{ name: 'serviceName', value: 'serviceName' }]);
        expect(q.serviceName.default()).toEqual(0);
        expect(await q.serviceName.validate!('testPackage')).toEqual(true);
        expect(q.draftEnabled.when!({})).toEqual(true);
        expect(await q.draftEnabled.validate!(true)).toEqual(true);
        expect(await q.draftEnabled.validate!(false)).toEqual(true);
        expect((q.launchAppGen as YUIQuestion).additionalMessages!(false)).toBeUndefined();
        expect((q.launchAppGen as YUIQuestion).additionalMessages!(true)).toEqual({
            message: t('info.appGenLaunch'),
            severity: 2
        });
    });
    test('getServiceConfigQuestions with error', async () => {
        const genMockValidateContent1 = {
            getContent: getContentMock,
            validateContent: jest.fn().mockResolvedValue({
                severity: 'ERROR'
            })
        } as any;
        const systemSelectionAnswers1 = {
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
            objectGenerator: genMockValidateContent1
        } as any;

        PromptState.resetConnectedSystem();
        q = {};
        questions = getConfigPrompts(systemSelectionAnswers1, {
            useDraftEnabled: false,
            useLaunchGen: false
        }).prompts;
        questions.forEach((question) => {
            q[question.name] = question as Question;
        });
        expect(await q.serviceName.when!({ packageManual: 'package' })).toEqual(true);
        expect(await q.serviceName.choices!()).toEqual([{ name: 'serviceName', value: 'serviceName' }]);
        expect(await q.serviceName.validate!('testPackage')).toMatchSnapshot();
        expect(q.draftEnabled).toBeUndefined();
        expect(q.launchAppGen).toBeUndefined();
        PromptState.resetServiceConfig();
        expect(await q.serviceName.when!({ packageManual: '', packageAutocomplete: '' })).toEqual(false);
        PromptState.resetServiceConfig();
        expect(await q.serviceName.when!({ packageManual: undefined, packageAutocomplete: undefined })).toEqual(false);

        PromptState.resetConnectedSystem();
        q = {};
        questions = getConfigPrompts(systemSelectionAnswers1, {
            useDraftEnabled: true,
            useLaunchGen: false
        }).prompts;
        questions.forEach((question) => {
            q[question.name] = question as Question;
        });
        expect(await q.serviceName.when!({ packageManual: 'package' })).toEqual(true);
        expect(await q.draftEnabled.validate!(false)).toEqual(t('error.validatingContent'));
    });

    test('getServiceConfigQuestions with error in validateContent', async () => {
        const genMockValidateContent2 = {
            getContent: getContentMock,
            validateContent: jest.fn().mockImplementation(() => {
                throw new Error('error');
            })
        } as any;
        const systemSelectionAnswers2 = {
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
            objectGenerator: genMockValidateContent2
        } as any;
        PromptState.resetConnectedSystem();
        questions = getConfigPrompts(systemSelectionAnswers2).prompts;
        questions.forEach((question) => {
            q[question.name] = question as Question;
        });
        expect(await q.serviceName.when!({ packageAutocomplete: 'package' })).toEqual(true);
        expect(await q.serviceName.validate!('testPackage')).toMatchSnapshot();
    });
});
