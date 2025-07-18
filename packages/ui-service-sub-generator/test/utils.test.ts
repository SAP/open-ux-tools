import * as utils from '../src/app/utils';
import { checkConnection, getAppGenSystemData } from '../src/app/utils';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { join } from 'path';
import fs from 'fs';
import type { Destination } from '@sap-ux/btp-utils';

const mockIsAppStudio = jest.fn();
jest.mock('@sap-ux/btp-utils', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/btp-utils') as {}),
    isAppStudio: () => mockIsAppStudio()
}));

jest.mock('@sap-ux/system-access', () => {
    return {
        ...(jest.requireActual('@sap-ux/system-access') as any),
        createAbapServiceProvider: jest.fn().mockResolvedValue({
            get: {}
        })
    };
});

const store = createMemFs();
const memFs = createEditor(store);
const testOutputDir = join(__dirname, '../test-output');
const metadata = fs.readFileSync(join(__dirname, 'fixtures', 'metadata.xml'), 'utf8');
const providerSystemMock = {
    name: 'testSystem',
    url: 'http://testsystem:44300',
    dataType: 1,
    proxyType: 2,
    authenticationType: 'BasicAuthentication',
    product: 'S/4 HANA',
    description: 'test system'
} as any;

jest.setTimeout(20000);

const providerMock = {
    get: jest.fn().mockResolvedValue({})
} as any;

describe('test helper functions', () => {
    afterAll(() => {});
    test('test checkConnection', () => {
        const providerMock = {
            get: jest.fn()
        } as any;
        expect(checkConnection(providerMock)).toBeDefined();
        expect(providerMock.get).toHaveBeenCalled();
    });

    test('test checkConnection - throws', async () => {
        const providerMock = {
            get: jest.fn().mockImplementation(() => {
                throw new Error('error');
            })
        } as any;
        expect(await checkConnection(providerMock)).toEqual(false);
        expect(providerMock.get).toHaveBeenCalled();
    });

    describe('generate functions', () => {
        test('generateService', async () => {
            const generatorMock = {
                log: jest.fn(),
                generate: jest.fn().mockResolvedValue({
                    objectReference: {
                        type: 'test',
                        uri: '/test/uri/from/generate'
                    }
                })
            } as any;
            const appWizardMock = {
                showInformation: jest.fn(),
                showError: jest.fn()
            } as any;
            const state = {
                service: {
                    serviceType: '',
                    uri: '',
                    serviceBindingName: ''
                },
                content: 'test content'
            };
            await expect(
                utils.generateService(generatorMock, state.content, 'tr12345', appWizardMock as AppWizard)
            ).toBeDefined();
        });

        test('generateService', async () => {
            const logMock = jest.fn();
            const mockResponse = { objectReference: { type: 'test', uri: '/test/uri/from/generate' } };
            const generatorMock = {
                log: logMock,
                generate: jest.fn().mockResolvedValue(mockResponse)
            } as any;
            const appWizardMock = {
                showInformation: jest.fn(),
                showError: jest.fn()
            } as any;

            const state = {
                service: {
                    serviceType: '',
                    uri: '',
                    serviceBindingName: ''
                },
                content: 'test content'
            };
            await expect(
                utils.generateService(generatorMock, state.content, 'tr12345', appWizardMock as AppWizard)
            ).resolves.toEqual(mockResponse);
        });

        test('generateService - throws', async () => {
            const logMock = jest.fn();
            const generatorMock = {
                log: logMock,
                generate: jest.fn().mockRejectedValue('service not generated')
            } as any;
            const appWizardMock = {
                showInformation: jest.fn(),
                showError: jest.fn()
            } as any;

            const state = {
                service: {
                    serviceType: '',
                    uri: '',
                    serviceBindingName: ''
                },
                content: 'test content'
            };
            await expect(
                utils.generateService(generatorMock, state.content, 'tr12345', appWizardMock as AppWizard)
            ).resolves.not.toThrow();
            expect(appWizardMock.showError).toHaveBeenCalled();
        });

        test('generateService - should write BAS service metadata file', async () => {
            const logMock = jest.fn();
            const generatorMock = {
                log: logMock,
                generate: jest.fn().mockResolvedValue({
                    objectReference: {
                        type: 'test',
                        uri: '/test/uri/from/generate'
                    }
                })
            } as any;
            const appWizardMock = {
                showInformation: jest.fn(),
                showError: jest.fn()
            } as any;

            const inputData = {
                systemName: 'testSystem',
                businessObject: 'I_BANKTP',
                path: testOutputDir,
                providerSystem: providerSystemMock
            };
            const state = {
                service: {
                    serviceType: '',
                    uri: '',
                    serviceBindingName: ''
                },
                suggestedServiceName: 'ZUI_BANKTP132_O4',
                content: `{"businessService": {
                    "serviceDefinition": {
                        "serviceDefinitionName": "ZUI_BANKTP134_O4",
                        "serviceDefinitionNameOrgn": "ZUI_BANKTP134_O4"
                    },
                    "serviceBinding": {
                        "serviceBindingName": "ZUI_BANKTP132_O4",
                        "serviceBindingNameOrgn": "ZUI_BANKTP132_O4",
                        "bindingType": "v4Ui"
                    }
                }
            }`,
                transportReqNumber: 'Y08K900503'
            };
            const providerMock = {
                get: jest.fn().mockResolvedValue({ data: metadata }),
                getAdtService: jest.fn()
            } as any;

            await expect(
                utils.generateService(generatorMock, state.content, 'tr12345', appWizardMock as AppWizard)
            ).resolves.not.toThrow();
        });

        test('validateConnection', async () => {
            const system = {};
            const checkConnectionSpy = jest
                .spyOn(utils, 'checkConnection')
                .mockResolvedValueOnce(true)
                .mockImplementation(() => {
                    throw new Error('error');
                });
            await utils.validateConnection('testSystem', system);
            expect(system).toEqual({
                connectedSystem: {
                    destination: {
                        Name: 'testSystem'
                    },
                    serviceProvider: {
                        get: {}
                    }
                }
            });
        });
    });

    test('writeBASMetadata', async () => {
        const state = {
            service: {
                serviceBindingName: '',
                serviceType: '',
                uri: ''
            },
            systems: undefined,
            systemName: undefined,
            authenticated: undefined,
            packageInputChoiceValid: true,
            morePackageResultsMsg: '',
            newTransportNumber: '',
            transportList: [],
            content: `{"businessService": {
                "serviceDefinition": {
                    "serviceDefinitionName": "ZUI_BANKTP134_O4",
                    "serviceDefinitionNameOrgn": "ZUI_BANKTP134_O4"
                },
                "serviceBinding": {
                    "serviceBindingName": "ZUI_BANKTP132_O4",
                    "serviceBindingNameOrgn": "ZUI_BANKTP132_O4",
                    "bindingType": "v4Ui"
                }
            }
        }`,
            suggestedServiceName: 'ZUI_BANKTP132_O4'
        };
        const appWizardMock = {
            showInformation: jest.fn(),
            showError: jest.fn()
        } as any;
        const providerMock = {
            get: jest.fn().mockResolvedValue({ data: metadata }),
            getAdtService: jest.fn()
        } as any;

        const inputData = {
            systemName: 'testSystem',
            businessObject: 'I_BANKTP',
            path: testOutputDir,
            providerSystem: providerSystemMock
        };
        const serviceConfig = {
            content: state.content,
            serviceName: state.suggestedServiceName,
            showDraftEnabled: false
        };
        await utils.writeBASMetadata(serviceConfig, memFs, appWizardMock, inputData, providerMock);
        const serviceMetadata = memFs.readJSON(join(testOutputDir, '.service.metadata'));
        expect(serviceMetadata).toMatchSnapshot();

        expect(utils.getRelativeUrlFromContent(state.content)).toEqual(
            '/sap/opu/odata4/sap/ZUI_BANKTP132_O4/srvd/sap/ZUI_BANKTP134_O4/0001/'
        );

        const providerMockError = {
            get: jest.fn().mockRejectedValue('error'),
            getAdtService: jest.fn()
        } as any;
        await utils.writeBASMetadata(serviceConfig, memFs, appWizardMock, inputData, providerMockError);
        expect(appWizardMock.showInformation).toHaveBeenLastCalledWith(
            'The UI service: ZUI_BANKTP132_O4 has been created but could not be added to your project.',
            1
        );
    });

    test('getRelativeUrlFromContent - content with custom namespace', async () => {
        const state = {
            content: `{"general":{"namespace":"/ITAPC1/"},"businessService": {
                "serviceDefinition": {
                    "serviceDefinitionName": "/ITAPC1/ZUI_BANKTP134_O4",
                    "serviceDefinitionNameOrgn": "/ITAPC1/ZUI_BANKTP134_O4"
                },
                "serviceBinding": {
                    "serviceBindingName": "/ITAPC1/ZUI_BANKTP132_O4",
                    "serviceBindingNameOrgn": "/ITAPC1/ZUI_BANKTP132_O4",
                    "bindingType": "v4Ui"
                }
            }
        }`
        };

        expect(utils.getRelativeUrlFromContent(state.content)).toEqual(
            '/sap/opu/odata4/ITAPC1/ZUI_BANKTP132_O4/srvd/ITAPC1/ZUI_BANKTP134_O4/0001/'
        );
    });

    test('runPostGenHook', async () => {
        jest.useFakeTimers();
        const providerMock1 = providerMock;
        const system = getAppGenSystemData({
            connectedSystem: {
                backendSystem: {
                    name: 'testSystem',
                    url: 'http://testsystem:44300',
                    client: '001'
                },
                serviceProvider: providerMock
            }
        });
        const options = {
            vscode: {
                commands: {
                    executeCommand: jest.fn()
                }
            },
            data: {}
        };
        const content = `{"businessService": {
            "serviceDefinition": {
                "serviceDefinitionName": "ZUI_BANKTP134_O4",
                "serviceDefinitionNameOrgn": "ZUI_BANKTP134_O4"
            },
            "serviceBinding": {
                "serviceBindingName": "ZUI_BANKTP132_O4",
                "serviceBindingNameOrgn": "ZUI_BANKTP132_O4",
                "bindingType": "v4Ui"
                }
            }
        }`;
        const metadata = fs.readFileSync(join(__dirname, 'fixtures', 'metadata.xml'), 'utf8');
        const getMetadataSpy = jest.spyOn(utils, 'getMetadata').mockResolvedValue(metadata);
        providerMock1.get.mockResolvedValue({ data: '' });
        mockIsAppStudio.mockReturnValue(false);
        await utils.runPostGenHook(options, system, content, providerMock);
        jest.advanceTimersByTime(1000);
        expect(options.vscode.commands.executeCommand).toHaveBeenCalledWith('sap.ux.service.generated.handler', {
            type: 'SERVICE_GEN_DATA',
            service: {
                metadata: '',
                url: '/sap/opu/odata4/sap/ZUI_BANKTP132_O4/srvd/sap/ZUI_BANKTP134_O4/0001/'
            },
            system: {
                client: '001',
                name: 'testSystem',
                url: 'http://testsystem:44300'
            }
        });
    });

    test('runPostGenHook with targetPath', async () => {
        jest.useFakeTimers();
        const system = getAppGenSystemData({
            connectedSystem: {
                backendSystem: {
                    name: 'testSystem',
                    url: 'http://testsystem:44300',
                    client: '001'
                },
                serviceProvider: providerMock
            }
        });
        const content = `{"businessService": {
            "serviceDefinition": {
                "serviceDefinitionName": "ZUI_BANKTP134_O4",
                "serviceDefinitionNameOrgn": "ZUI_BANKTP134_O4"
            },
            "serviceBinding": {
                "serviceBindingName": "ZUI_BANKTP132_O4",
                "serviceBindingNameOrgn": "ZUI_BANKTP132_O4",
                "bindingType": "v4Ui"
                }
            }
        }`;
        const targetPath = '/test/target/path/project1';
        const metadata = fs.readFileSync(join(__dirname, 'fixtures', 'metadata.xml'), 'utf8');
        const getMetadataSpy = jest.spyOn(utils, 'getMetadata').mockResolvedValue(metadata);
        mockIsAppStudio.mockReturnValue(false);
        const options = {
            vscode: {
                commands: {
                    executeCommand: jest.fn()
                }
            },
            data: {
                path: targetPath
            }
        };
        await utils.runPostGenHook(options, system, content, providerMock);
        jest.advanceTimersByTime(1000);
        expect(options.vscode.commands.executeCommand).toHaveBeenCalledWith('sap.ux.service.generated.handler', {
            type: 'SERVICE_GEN_DATA',
            service: {
                metadata: '',
                url: '/sap/opu/odata4/sap/ZUI_BANKTP132_O4/srvd/sap/ZUI_BANKTP134_O4/0001/'
            },
            system: {
                client: '001',
                name: 'testSystem',
                url: 'http://testsystem:44300'
            },
            project: {
                targetPath: '/test/target/path',
                name: 'project1'
            }
        });
    });

    test('runPostGenHook with targetPath and vscode object incomplete', async () => {
        jest.useFakeTimers();
        const system = getAppGenSystemData({
            connectedSystem: {
                backendSystem: {
                    name: 'testSystem',
                    url: 'http://testsystem:44300',
                    client: '001'
                },
                serviceProvider: providerMock
            }
        });
        const vsCodeMock = undefined;
        const content = `{"businessService": {
            "serviceDefinition": {
                "serviceDefinitionName": "ZUI_BANKTP134_O4",
                "serviceDefinitionNameOrgn": "ZUI_BANKTP134_O4"
            },
            "serviceBinding": {
                "serviceBindingName": "ZUI_BANKTP132_O4",
                "serviceBindingNameOrgn": "ZUI_BANKTP132_O4",
                "bindingType": "v4Ui"
                }
            }
        }`;
        const targetPath = '/test/target/path/project1';
        const metadata = fs.readFileSync(join(__dirname, 'fixtures', 'metadata.xml'), 'utf8');
        const getMetadataSpy = jest.spyOn(utils, 'getMetadata').mockResolvedValue(metadata);
        mockIsAppStudio.mockReturnValue(false);
        const options = {
            vsCodeMock,
            data: {
                path: targetPath
            }
        };
        await expect(utils.runPostGenHook(options, system, content, providerMock)).resolves.not.toThrow();
        jest.advanceTimersByTime(1000);
    });

    test('getAppGenSystemData - AppStudio is true', () => {
        mockIsAppStudio.mockReturnValue(true);
        const systemData = getAppGenSystemData({
            connectedSystem: {
                destination: {
                    Name: 'testSystem'
                } as Destination,
                serviceProvider: providerMock
            }
        });
        expect(systemData).toEqual({
            destination: 'testSystem'
        });
    });
});
