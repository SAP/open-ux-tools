import * as utils from '../src/app/utils';
import { checkConnection, getAppGenSystemData } from '../src/app/utils';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { create as createMemFs } from 'mem-fs';
import { create as createEditor } from 'mem-fs-editor';
import { join } from 'path';
import fs from 'fs';
import type { Destination } from '@sap-ux/btp-utils';
import type { BackendSystem } from '@sap-ux/store';

const mockIsAppStudio = jest.fn();
jest.mock('@sap-ux/btp-utils', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    ...(jest.requireActual('@sap-ux/btp-utils') as {}),
    isAppStudio: () => mockIsAppStudio()
}));

jest.mock('@sap-ux/system-access', () => {
    return {
        ...(jest.requireActual('@sap-ux/system-access') as any),
        createAbapServiceProvider: jest.fn()
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
    afterAll(() => {
        //rimraf.sync(testOutputDir);
    });
    test('test checkConnection', () => {
        const providerMock = {
            get: jest.fn()
        } as any;
        expect(checkConnection(providerMock)).toBeDefined();
        expect(providerMock.get).toBeCalled();
    });

    test('test checkConnection - throws', async () => {
        const providerMock = {
            get: jest.fn().mockImplementation(() => {
                throw new Error('error');
            })
        } as any;
        expect(await checkConnection(providerMock)).toEqual(false);
        expect(providerMock.get).toBeCalled();
    });

    // test('getBusinessObjects', async () => {
    //     const testBusinessObjects = [{ name: 'I_BANKTP', description: 'Banking', type: 'Business Object' }];
    //     const providerMock = {
    //         get: jest.fn(),
    //         getAdtService: jest.fn().mockResolvedValue({
    //             getBusinessObjects: jest.fn().mockResolvedValue(testBusinessObjects)
    //         })
    //     } as any;
    //     expect(await utils.getBusinessObjects(providerMock)).toEqual([
    //         { name: 'I_BANKTP (Banking)', value: { description: 'Banking', name: 'I_BANKTP', type: 'Business Object' } }
    //     ]);
    // });

    // test('getAbapCDSViews', async () => {
    //     const testCDSViews = [
    //         { name: 'C_GRANTORCLAIMITEMDEX', description: 'Abap CDS View', uri: 'test/uri/for/cds/view' }
    //     ];
    //     const providerMock = {
    //         get: jest.fn(),
    //         getAdtService: jest.fn().mockResolvedValue({
    //             getAbapCDSViews: jest.fn().mockResolvedValue(testCDSViews)
    //         })
    //     } as any;
    //     expect(await utils.getAbapCDSViews(providerMock)).toEqual([
    //         {
    //             name: 'C_GRANTORCLAIMITEMDEX (Abap CDS View)',
    //             value: { description: 'Abap CDS View', name: 'C_GRANTORCLAIMITEMDEX', uri: 'test/uri/for/cds/view' }
    //         }
    //     ]);
    // });

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
            expect(appWizardMock.showError).toBeCalled();
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
            //utils.PromptState.provider = providerMock;

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
                    }
                }
            });
            // const system1 = {};
            // await utils.validateConnection('testSystem', system1);
            // expect(system).toEqual({});
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
        //utils.PromptState.provider = providerMock;

        const inputData = {
            systemName: 'testSystem',
            businessObject: 'I_BANKTP',
            path: testOutputDir,
            providerSystem: providerSystemMock
        };
        const serviceConfig = {
            content: state.content,
            serviceName: state.suggestedServiceName
        };
        await utils.writeBASMetadata(serviceConfig, memFs, appWizardMock, inputData, providerMock);
        const serviceMetadata = memFs.readJSON(join(testOutputDir, '.service.metadata'));
        expect(serviceMetadata).toMatchSnapshot();

        const providerMockError = {
            get: jest.fn().mockRejectedValue('error'),
            getAdtService: jest.fn()
        } as any;
        //utils.PromptState.provider = providerMockError;
        await utils.writeBASMetadata(serviceConfig, memFs, appWizardMock, inputData, providerMockError);
        expect(appWizardMock.showInformation).toHaveBeenLastCalledWith(
            'UI Service ZUI_BANKTP132_O4 has been created successfully but could not be added to your project',
            1
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
        // const vsCodeMock = {
        //     commands: {
        //         executeCommand: jest.fn()
        //     }
        // };
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
        expect(options.vscode.commands.executeCommand).toBeCalledWith('sap.ux.service.generated.handler', {
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
        // const vsCodeMock = {
        //     commands: {
        //         executeCommand: jest.fn()
        //     }
        // };
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
        expect(options.vscode.commands.executeCommand).toBeCalledWith('sap.ux.service.generated.handler', {
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

        // const systemData1 = getAppGenSystemData({
        //     systemName: 'testSystem'
        // });
        // expect(systemData1).toEqual({
        //     destination: 'testSystem'
        // });
    });

    // test('createAbapTarget', () => {
    //     const destination = { Name: 'testSystem' } as Destination;
    //     const abapTarget = utils.createAbapTarget(destination);
    //     expect(abapTarget).toEqual({ destination: 'testSystem' });

    //     const backendSystem = {
    //         url: 'http://testsystem:44300',
    //         client: '001'
    //     } as BackendSystem;
    //     const abapTarget1 = utils.createAbapTarget(undefined, backendSystem);
    //     expect(abapTarget1).toEqual({ url: 'http://testsystem:44300', client: '001' });
    // });
});
