import { getSystemSelectionPrompts, getConfigPrompts } from '../src';
import nock from 'nock';
import type { Answers, Question as YoQuestion } from 'inquirer';
import * as promptHelper from '../src/prompts/prompt-helper';
import { genContent } from './fixtures/constants';
import { PromptState } from '../src/prompts/prompt-state';
import { ObjectType } from '../src/types';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

jest.mock('../src/logger-helper');

const mockIsAppStudio = jest.fn();
jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as object),
        isAppStudio: () => mockIsAppStudio()
    };
});

jest.mock('../src/logger-helper', () => ({
    logger: {
        warn: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock('@sap-ux/inquirer-common', () => ({
    ...(jest.requireActual('@sap-ux/inquirer-common') as {}),
    setTelemetryClient: () => jest.fn()
}));

jest.mock('@sap-ux/telemetry', () => ({
    ...(jest.requireActual('@sap-ux/telemetry') as {}),
    ClientFactory: {
        getTelemetryClient: jest.fn().mockResolvedValue({})
    }
}));
interface Question extends YoQuestion {
    when?: (answers: Answers) => boolean | Promise<boolean>;
    message?: (answers?: Answers) => string;
    choices?: () => string[];
    source?: (answers: Answers, input: string) => string[];
    additionalInfo?: () => string;
}

jest.mock('@sap-ux/system-access', () => {
    return {
        ...(jest.requireActual('@sap-ux/system-access') as object),
        createAbapServiceProvider: jest.fn().mockResolvedValue({ get: jest.fn() } as any)
    };
});

jest.mock('@sap-ux/odata-service-inquirer', () => ({
    ...(jest.requireActual('@sap-ux/odata-service-inquirer') as object),
    getSystemSelectionQuestions: jest.fn().mockResolvedValue({
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
    })
}));

const answersMock = {
    systemSelection: 'system1',
    transport: 'transport1',
    serviceConfig: 'serviceConfig1',
    packageInputChoice: 'manualInput'
};

describe('getSystemQuestions', () => {
    beforeAll(() => {
        nock.disableNetConnect();
    });

    afterAll(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    let questions;
    const q: { [key: string]: Question } = {};

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

        jest.spyOn(promptHelper, 'getBusinessObjects').mockResolvedValue([businessObjectMockResp]);
        jest.spyOn(promptHelper, 'getAbapCDSViews').mockResolvedValue([abapCDSViewsMockResp]);
        questions = (await getSystemSelectionPrompts()).prompts;
        questions.forEach((question: any) => {
            q[question.name] = question as Question;
        });
        expect(questions).toMatchSnapshot();

        expect(q.objectType.when!({ systemSelection: 'system1' })).toEqual(true);
        expect(q.objectType.choices!()).toEqual([
            { name: 'prompts.businessObjectInterfaceLabel', value: ObjectType.BUSINESS_OBJECT },
            { name: 'prompts.abapCdsServiceLabel', value: ObjectType.CDS_VIEW }
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
            'error.noGeneratorFoundBo'
        );

        expect(await q.abapCDSView.when!({ objectType: ObjectType.CDS_VIEW })).toEqual(true);
        expect(await q.abapCDSView.choices!()).toEqual([abapCDSViewsMockResp]);
        expect(await q.abapCDSView.validate!(abapCDSViewMock, answersMock)).toEqual('error.noGeneratorFoundCdsService');

        mockIsAppStudio.mockReturnValue(false);
        questions = (await getSystemSelectionPrompts()).prompts;
        questions.forEach((question: any) => {
            q[question.name] = question as Question;
        });
    });

    test('getServiceConfigQuestions', async () => {
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
        const genMock = {
            getContent: getContentMock,
            validateContent: jest.fn().mockResolvedValue({
                severity: 'OK'
            })
        } as any;
        const systemSelectionAnswers = {
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
        expect(q.transportInputChoice.choices!()).toMatchSnapshot();
        expect(await q.serviceName.when!({ packageManual: '', packageAutocomplete: 'package' })).toEqual(true);
        expect(q.serviceName.choices!()).toEqual([{ name: 'serviceName', value: 'serviceName' }]);
        expect(q.serviceName.default()).toEqual(0);
        expect(await q.serviceName.validate!('testPackage')).toEqual(true);
        expect(q.draftEnabled.when!({})).toEqual(true);
        expect(await q.draftEnabled.validate!(true)).toEqual(true);
        expect(await q.draftEnabled.validate!(false)).toEqual(true);
        expect(q.launchAppGen.when!({})).toEqual(true);
        expect((q.launchAppGen as YUIQuestion).additionalMessages!(false)).toBeUndefined();
        expect((q.launchAppGen as YUIQuestion).additionalMessages!(true)).toEqual({
            message: 'info.appGenLaunch',
            severity: 2
        });

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
        expect(q.draftEnabled.when!({})).toEqual(false);
        expect(await q.draftEnabled.validate!(false)).toEqual('error.validatingContent');
        PromptState.resetServiceConfig();
        expect(await q.serviceName.when!({ packageManual: '', packageAutocomplete: '' })).toEqual(false);
        PromptState.resetServiceConfig();
        expect(await q.serviceName.when!({ packageManual: undefined, packageAutocomplete: undefined })).toEqual(false);
        expect(q.launchAppGen.when!({})).toEqual(false);
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
