//import { getServiceConfigQuestions, getSystemQuestions } from '../src/app/prompts';
import { getSystemSelectionPrompts, getConfigPrompts } from '../src';
//import { PackageInputChoices } from '../src/types';
import nock from 'nock';
import type { Answers, Question as YoQuestion } from 'inquirer';
import * as promptHelper from '../src/prompts/prompt-helper';
import { genContent } from './fixtures/constants';
import { PromptState } from '../src/prompts/prompt-state';
import { ObjectType } from '../src/types';
import type { YUIQuestion } from '@sap-ux/inquirer-common';
import Prompt from 'inquirer/lib/prompts/base';
import type { AbapServiceProvider, ServiceProvider } from '@sap-ux/axios-extension';
import { Destination } from '@sap-ux/btp-utils';

jest.mock('../src/logger-helper');

const mockIsAppStudio = jest.fn();
jest.mock('@sap-ux/btp-utils', () => {
    return {
        ...(jest.requireActual('@sap-ux/btp-utils') as object),
        isAppStudio: () => mockIsAppStudio()
    };
});

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

const state = {
    service: {
        serviceBindingName: 'serviceBindingName',
        serviceType: 'serviceType',
        uri: 'uri'
    },
    authenticated: true,
    packageInputChoiceValid: true,
    morePackageResultsMsg: 'morePackageResultsMsg',
    newTransportNumber: '123456789',
    transportList: [],
    content: genContent,
    suggestedServiceName: 'suggestedServiceName'
};

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
        //jest.spyOn(promptHelper, 'checkConnection').mockResolvedValue(true);
        questions = (await getSystemSelectionPrompts()).prompts;
        // PromptState.systemSelection = {
        //     connectedSystem: {
        //         serviceProvider: { getUiServiceGenerator: { generate: jest.fn() } } as unknown as AbapServiceProvider
        //     }
        // };
        questions.forEach((question: any) => {
            q[question.name] = question as Question;
        });
        expect(questions).toMatchSnapshot();

        expect(q.objectType.when!({ systemSelection: 'system1' })).toEqual(true);
        expect(q.objectType.choices!()).toEqual([
            { name: 'MESSAGE_BUSINESS_OBJECT_INTERFACE', value: ObjectType.BUSINESS_OBJECT },
            { name: 'MESSAGE_ABAP_CDS_SERVICE', value: ObjectType.CDS_VIEW }
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

        expect(await q.businessObjectInterface.choices!()).toEqual([businessObjectMockResp]);
        // expect(await q.businessObjectInterface.validate!(businessObjectMock, answersMock)).toEqual(
        //     'No generator found for the selected business object interface'
        // );

        expect(await q.abapCDSView.choices!()).toEqual([abapCDSViewsMockResp]);
        // expect(await q.abapCDSView.validate!(abapCDSViewMock, answersMock)).toEqual(
        //     'No generator found for the selected abap cds service'
        // );

        // jest.spyOn(promptHelper, 'checkConnection').mockImplementation(() => {
        //     throw new Error('error');
        // });
        const providerMock = {
            getUiServiceGenerator: jest.fn().mockResolvedValue({})
        } as any;
        mockIsAppStudio.mockReturnValue(false);
        //PromptState.provider = providerMock;
        questions = (await getSystemSelectionPrompts()).prompts;
        questions.forEach((question: any) => {
            q[question.name] = question as Question;
        });
        // expect(await q.businessObjectInterface.validate!(businessObjectMock)).toEqual(true);
        // expect(await q.abapCDSView.validate!(abapCDSViewMock)).toEqual(true);
    });

    test('getServiceConfigQuestions', async () => {
        PromptState.reset();
        const providerMock = {
            getAdtService: jest.fn().mockResolvedValue({ listPackages: jest.fn().mockResolvedValue(['testPackage']) })
        } as any;
        //jest.spyOn(promptHelper, 'checkConnection').mockResolvedValue(true);
        const genMock = {
            getContent: jest.fn().mockResolvedValue(
                JSON.stringify({
                    businessService: {
                        serviceBinding: {
                            serviceBindingName: 'serviceName'
                        }
                    },
                    businessObject: {
                        projectionBehavior: {
                            withDraft: undefined
                        }
                    }
                })
            ),
            validateContent: jest.fn().mockResolvedValue({
                severity: 'OK'
            })
        } as any;
        // PromptState.uiCreateService = genMock;
        // PromptState.provider = providerMock;
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
            objectGenerator: {
                getContent: jest.fn().mockResolvedValue(genContent),
                generate: jest.fn().mockResolvedValue({})
            }
        } as any;

        questions = getConfigPrompts(systemSelectionAnswers).prompts;
        questions.forEach((question) => {
            q[question.name] = question as Question;
        });
        expect(questions).toMatchSnapshot();

        expect(q.transportInputChoice.choices!()).toMatchSnapshot();

        const answersMockAuto = {
            sapSystem: 'system1',
            transport: 'transport1',
            serviceConfig: 'serviceConfig1',
            packageInputChoice: 'manualInput',
            packageAutocomplete: 'testPackage',
            packageManual: 'testPackage'
        };

        expect(await q.serviceName.when!({ packageAutocomplete: 'package' })).toEqual(true);
        // expect(JSON.parse(state.content)).toEqual({
        //     businessObject: {
        //         projectionBehavior: {
        //             withDraft: true
        //         }
        //     },
        //     businessService: {
        //         serviceBinding: {
        //             serviceBindingName: 'serviceName'
        //         }
        //     }
        // });
        // expect(await q.draftEnabled.validate!(true)).toEqual(true);
        // expect(await q.draftEnabled.validate!(false)).toEqual(true);

        expect((q.launchAppGen as YUIQuestion).additionalMessages!(false)).toBeUndefined();
        expect((q.launchAppGen as YUIQuestion).additionalMessages!(true)).toEqual({
            message: 'INFO_APP_GEN_LAUNCH',
            severity: 2
        });

        const genMockValidateContent = {
            validateContent: jest.fn().mockResolvedValue({
                severity: 'ERROR'
            })
        } as any;
        //PromptState.uiCreateService = genMockValidateContent;
        questions = getConfigPrompts(systemSelectionAnswers).prompts;
        questions.forEach((question) => {
            q[question.name] = question as Question;
        });
        //expect(await q.serviceName.choices!()).toEqual([{ name: 'serviceName', value: 'serviceName' }]);
        expect(q.serviceName.default()).toEqual(0);
        //expect(await q.serviceName.validate!('testPackage')).toMatchSnapshot();

        //expect(await q.draftEnabled.validate!(false)).toMatchSnapshot();

        const genMockValidateContent1 = {
            validateContent: jest.fn().mockImplementation(() => {
                throw new Error('error');
            })
        } as any;
        //PromptState.uiCreateService = genMockValidateContent1;
        //expect(await q.serviceName.validate!('testPackage')).toMatchSnapshot();

        const genMockValidateContent2 = {
            validateContent: jest.fn().mockResolvedValue({
                severity: 'OK'
            })
        } as any;
        //PromptState.uiCreateService = genMockValidateContent2;
        //expect(await q.serviceName.validate!('testPackage')).toEqual(true);
    });
});
