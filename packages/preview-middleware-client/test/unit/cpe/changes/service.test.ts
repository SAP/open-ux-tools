import * as flexChange from '../../../../src/cpe/changes/flex-change';
import { ChangeService } from '../../../../src/cpe/changes/service';
import { ActionHandler } from '../../../../src/cpe/types';
import { changeProperty, deletePropertyChanges, numberOfChangesRequiringReloadChanged } from '@sap-ux-private/control-property-editor-common';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

import { fetchMock } from 'mock/window';
describe('SelectionService', () => {
    const applyChangeSpy = jest.spyOn(flexChange, 'applyChange').mockImplementation(() => {
        return Promise.resolve();
    });
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock<void, [ActionHandler]>;
    const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

    beforeEach(() => {
        rtaMock.attachUndoRedoStackModified = jest.fn() as jest.Mock;
        sendActionMock = jest.fn();
        subscribeMock = jest.fn<void, [ActionHandler]>();
        fetchMock.mockClear();
    });

    function createCompositeCommand(subCommands: any): {
        getCommands: () => any;
    } {
        return {
            getCommands: jest.fn().mockReturnValue(subCommands)
        };
    }

    test('read workspace changes', async () => {
        fetchMock.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    change1: {
                        changeType: 'propertyChange',
                        fileName: 'id_1640106755570_203_propertyChange',
                        content: {
                            property: 'enabled',
                            newValue: true
                        },
                        selector: {
                            id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                            type: 'sap.m.Button'
                        },
                        creation: '2021-12-21T17:12:37.301Z'
                    },
                    change2: {
                        changeType: 'propertyChange',
                        fileName: 'id_1640106755570_204_propertyChange',
                        content: {
                            property: 'enabled',
                            newBinding: '{i18n>CREATE_OBJECT2}'
                        },
                        selector: {
                            id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                            type: 'sap.m.Button'
                        },
                        creation: '2021-12-21T17:13:37.301Z'
                    },
                    change3: {
                        changeType: 'propertyChange',
                        fileName: 'id_1640106755570_204_propertyChange',
                        content: {
                            property: 'enabled',
                            newBindings: '{i18n>CREATE_OBJECT2}'
                        },
                        selector: {
                            id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                            type: 'sap.m.Button'
                        },
                        creation: '2021-12-21T17:13:37.301Z'
                    },
                    change4: {}
                })
        });
        jest.spyOn(Date, 'now').mockReturnValueOnce(123);

        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);
        expect(fetchMock).toHaveBeenCalledWith('/preview/api/changes?_=123');
        expect(sendActionMock).toHaveBeenCalledWith({
            type: '[ext] change-stack-modified',
            payload: {
                pending: [],
                saved: [
                    {
                        changeType: 'propertyChange',
                        type: 'saved',
                        kind: 'property',
                        fileName: 'id_1640106755570_204_propertyChange',
                        controlName: 'Button',
                        controlId:
                            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                        propertyName: 'enabled',
                        value: '{i18n>CREATE_OBJECT2}',
                        timestamp: 1640106817301
                    },
                    {
                        changeType: 'propertyChange',
                        type: 'saved',
                        kind: 'unknown',
                        controlId:
                            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                        fileName: 'id_1640106755570_204_propertyChange',
                        timestamp: 1640106817301
                    },
                    {
                        changeType: 'propertyChange',
                        type: 'saved',
                        kind: 'property',
                        fileName: 'id_1640106755570_203_propertyChange',
                        controlName: 'Button',
                        controlId:
                            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                        propertyName: 'enabled',
                        value: true,
                        timestamp: 1640106757301
                    }
                ]
            }
        });
    });

    test('unknown change with timestamp', async () => {
        fetchMock.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    change2: {
                        changeType: 'propertyChange',
                        fileName: 'id_1640106755570_204_propertyChange',
                        content: {
                            property: 'enabled',
                            newBinding: '{i18n>CREATE_OBJECT2}'
                        },
                        selector: {
                            id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                            type: 'sap.m.Button'
                        },
                        creation: '2021-12-21T17:13:37.301Z'
                    },
                    change3: {
                        changeType: 'addXML',
                        fileName: 'unknown',
                        creation: '2021-12-21T17:14:37.301Z',
                        selector: {
                            id: 'SEPMRA_C_PD_Product--template::ListReport::TableToolbar',
                            idIsLocal: false
                        }
                    }
                })
        });
        jest.spyOn(Date, 'now').mockReturnValueOnce(123);

        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);
        expect(fetchMock).toHaveBeenCalledWith('/preview/api/changes?_=123');
        expect(sendActionMock).toHaveBeenCalledWith({
            type: '[ext] change-stack-modified',
            payload: {
                pending: [],
                saved: [
                    {
                        type: 'saved',
                        kind: 'unknown',
                        fileName: 'unknown',
                        changeType: 'addXML',
                        timestamp: 1640106877301,
                        controlId: 'SEPMRA_C_PD_Product--template::ListReport::TableToolbar'
                    },
                    {
                        type: 'saved',
                        kind: 'property',
                        changeType: 'propertyChange',
                        fileName: 'id_1640106755570_204_propertyChange',
                        controlName: 'Button',
                        controlId:
                            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                        propertyName: 'enabled',
                        value: '{i18n>CREATE_OBJECT2}',
                        timestamp: 1640106817301
                    }
                ]
            }
        });
    });

    test('composite command', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });
        function createCommand(properties: Map<string, any>): {
            getElement: () => any;
            getSelector: () => any;
            getChangeType: () => string;
            getPreparedChange: () => { getDefinition: () => { fileName: string } };
        } {
            const cache = new Map(properties);
            return {
                getElement: jest.fn().mockReturnValue({
                    getMetadata: jest
                        .fn()
                        .mockReturnValue({ getName: jest.fn().mockReturnValue('sap.ui.layout.form.SimpleForm') }),
                    getProperty: jest.fn().mockReturnValue('_ST_SmartVariantManagement')
                }),
                getSelector: jest.fn().mockReturnValue({
                    id: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button'
                }),
                getChangeType: (): any => {
                    return cache.get('changeType');
                },
                getPreparedChange: (): { getDefinition: () => { fileName: string } } => {
                    return { getDefinition: () => ({ fileName: 'testFileName' }) };
                }
            };
        }
        const subCommands = [
            createCommand(
                new Map<string, any>([
                    ['selector', { id: 'SEPMRA_C_PD_Product--supplierView--supplierForm' }],
                    ['changeType', 'addSimpleFormField'],
                    ['name', 'addDelegateProperty']
                ])
            ),
            createCommand(
                new Map<string, any>([
                    ['selector', { id: 'supplierForm_SEPMRA_C_PD_SupplierType_FaxNumber' }],
                    ['changeType', 'addSimpleFormField'],
                    ['name', 'addDelegateProperty']
                ])
            )
        ];

        const compositeCommand = [createCompositeCommand(subCommands)];

        rtaMock.getCommandStack.mockReturnValue({
            getCommands: jest.fn().mockReturnValue(compositeCommand),
            getAllExecutedCommands: jest.fn().mockReturnValue(compositeCommand)
        });
        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);

        await (rtaMock.attachUndoRedoStackModified as jest.Mock).mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenCalledTimes(4);
        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] change-stack-modified',
            payload: {
                saved: [],
                pending: [
                    {
                        changeType: 'addSimpleFormField',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        controlName: 'SimpleForm',
                        fileName: 'testFileName',
                        kind: 'unknown',
                        type: 'pending'
                    },
                    {
                        changeType: 'addSimpleFormField',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        controlName: 'SimpleForm',
                        fileName: 'testFileName',
                        kind: 'unknown',
                        type: 'pending'
                    }
                ]
            }
        });
    });

    test('composite command - comp/control changes', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });
        function createCommand(): {
            getElement: () => any;
            getPreparedChange: () => any;
        } {
            return {
                getElement: jest.fn().mockReturnValue({
                    getMetadata: jest
                        .fn()
                        .mockReturnValue({ getName: jest.fn().mockReturnValue('sap.ui.layout.form.SimpleForm') }),
                    getProperty: jest.fn().mockReturnValue('_ST_SmartVariantManagement')
                }),
                getPreparedChange: jest.fn().mockReturnValue({
                    getDefinition: jest.fn().mockReturnValue({
                        changeType: 'page',
                        fileName: 'fileName'
                    })
                })
            };
        }
        const subCommands = [createCommand(), createCommand()];
        const compositeCommand = [createCompositeCommand(subCommands)];

        rtaMock.getCommandStack.mockReturnValue({
            getCommands: jest.fn().mockReturnValue(compositeCommand),
            getAllExecutedCommands: jest.fn().mockReturnValue(compositeCommand)
        });
        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);

        await (rtaMock.attachUndoRedoStackModified as jest.Mock).mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenCalledTimes(4);
        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] change-stack-modified',
            payload: {
                saved: [],
                pending: [
                    {
                        changeType: 'page',
                        controlId: '_ST_SmartVariantManagement',
                        isActive: true,
                        controlName: 'SimpleForm',
                        kind: 'unknown',
                        fileName: 'fileName',
                        type: 'pending'
                    },
                    {
                        changeType: 'page',
                        controlId: '_ST_SmartVariantManagement',
                        isActive: true,
                        controlName: 'SimpleForm',
                        kind: 'unknown',
                        fileName: 'fileName',
                        type: 'pending'
                    }
                ]
            }
        });
    });

    test('composite command - unknown commands', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });
        function createCommand(): {} {
            return {};
        }
        const subCommands = [createCommand(), createCommand()];

        const compositeCommand = [createCompositeCommand(subCommands)];

        rtaMock.getCommandStack.mockReturnValue({
            getCommands: jest.fn().mockReturnValue(compositeCommand),
            getAllExecutedCommands: jest.fn().mockReturnValue(compositeCommand)
        });
        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);

        await (rtaMock.attachUndoRedoStackModified as jest.Mock).mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenCalledTimes(4);
        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] change-stack-modified',
            payload: {
                saved: [],
                pending: []
            }
        });
    });

    test('undo/redo stack changed', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });
        function createCommand(
            properties: Map<string, any>,
            toggle = false
        ): {
            getProperty: (name: string) => any;
            getElement: () => any;
            getSelector: () => any;
            getChangeType: () => string;
            getParent: () => any;
            getPreparedChange: () => { getDefinition: () => { fileName: string } };
        } {
            const cache = new Map(properties);
            return {
                getProperty: (name: string): any => {
                    return cache.get(name);
                },
                getElement: jest.fn().mockReturnValue({
                    getMetadata: jest.fn().mockReturnValue({ getName: jest.fn().mockReturnValue('sap.m.Button') })
                }),
                getSelector: jest.fn().mockReturnValue({
                    id: !toggle ? 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button' : undefined,
                    name: 'ExtensionPoint1'
                }),
                getChangeType: (): any => {
                    return cache.get('changeType');
                },
                getParent: jest.fn().mockReturnValue({
                    getElement: jest.fn().mockReturnValue({
                        getId: () => 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button'
                    })
                }),
                getPreparedChange: (): { getDefinition: () => { fileName: string } } => {
                    return { getDefinition: () => ({ fileName: 'testFileName' }) };
                }
            };
        }
        const commands = [
            createCommand(
                new Map<string, any>([
                    ['selector', { id: 'control1' }],
                    ['changeType', 'propertyChange'],
                    ['propertyName', 'text'],
                    ['newValue', 'abc']
                ])
            ),
            createCommand(
                new Map<string, any>([
                    ['selector', { id: 'control1' }],
                    ['changeType', 'propertyBindingChange'],
                    ['propertyName', 'text'],
                    ['newBinding', '{i18n>DELETE}']
                ])
            ),
            createCommand(
                new Map<string, any>([
                    ['selector', { id: 'control2' }],
                    ['changeType', 'addXMLAtExtensionPoint']
                ]),
                true
            )
        ];
        rtaMock.getCommandStack.mockReturnValue({
            getCommands: jest.fn().mockReturnValue(commands),
            getAllExecutedCommands: jest.fn().mockReturnValue(commands)
        });
        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);

        await (rtaMock.attachUndoRedoStackModified as jest.Mock).mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenCalledTimes(4);
        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] change-stack-modified',
            payload: {
                saved: [],
                pending: [
                    {
                        changeType: 'propertyChange',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        propertyName: 'text',
                        controlName: 'Button',
                        fileName: 'testFileName',
                        type: 'pending',
                        kind: 'property',
                        value: 'abc'
                    },
                    {
                        changeType: 'propertyBindingChange',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        propertyName: 'text',
                        controlName: 'Button',
                        fileName: 'testFileName',
                        type: 'pending',
                        kind: 'property',
                        value: '{i18n>DELETE}'
                    },
                    {
                        changeType: 'addXMLAtExtensionPoint',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        controlName: 'ExtensionPoint1',
                        fileName: 'testFileName',
                        isActive: true,
                        kind: 'unknown',
                        type: 'pending'
                    }
                ]
            }
        });
    });

    test('change property', async () => {
        fetchMock.mockResolvedValue({
            json: () => Promise.resolve({})
        });

        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);
        expect(subscribeMock).toHaveBeenCalledTimes(1);
        await subscribeMock.mock.calls[0][0](
            changeProperty({
                controlId: 'control1',
                propertyName: 'text',
                controlName: 'button',
                value: 'abc',
                changeType: 'propertyChange'
            })
        );

        expect(applyChangeSpy.mock.calls[0][1]).toStrictEqual({
            changeType: 'propertyChange',
            controlId: 'control1',
            controlName: 'button',
            propertyName: 'text',
            value: 'abc'
        });
    });

    test('manifest change', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });
        function createCommand(
            properties: Map<string, any>,
            toggle = false
        ): {
            getProperty: (name: string) => any;
            getElement: () => any;
            getSelector: () => any;
            getChangeType: () => string;
            getParent: () => any;
            getPreparedChange: () => { getDefinition: () => { fileName: string } };
        } {
            const cache = new Map(properties);
            return {
                getProperty: (name: string): any => {
                    return cache.get(name);
                },
                getElement: jest.fn().mockReturnValue({
                    getMetadata: jest.fn().mockReturnValue({ getName: jest.fn().mockReturnValue('sap.m.Button') })
                }),
                getSelector: jest.fn().mockReturnValue({
                    id: !toggle ? 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button' : undefined,
                    name: 'ExtensionPoint1'
                }),
                getChangeType: (): any => {
                    return cache.get('changeType');
                },
                getParent: jest.fn().mockReturnValue({
                    getElement: jest.fn().mockReturnValue({
                        getId: () => 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button'
                    })
                }),
                getPreparedChange: (): { getDefinition: () => { fileName: string } } => {
                    return { getDefinition: () => ({ fileName: 'testFileName' }) };
                }
            };
        }
        const commands = [
            createCommand(
                new Map<string, any>([
                    ['selector', { id: 'control1' }],
                    ['changeType', 'appdescr_fe_changePageConfiguration'],
                    ['propertyName', 'text'],
                    ['newValue', 'abc']
                ])
            ),
        ];
        rtaMock.getCommandStack.mockReturnValue({
            getCommands: jest.fn().mockReturnValue(commands),
            getAllExecutedCommands: jest.fn().mockReturnValue(commands)
        });
        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);

        await (rtaMock.attachUndoRedoStackModified as jest.Mock).mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenCalledTimes(5);
        expect(sendActionMock).toHaveBeenNthCalledWith(2, numberOfChangesRequiringReloadChanged(1))
        expect(sendActionMock).toHaveBeenNthCalledWith(3, {
            type: '[ext] change-stack-modified',
            payload: {
                saved: [],
                pending: [
                    {
                        changeType: 'appdescr_fe_changePageConfiguration',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        controlName: 'Button',
                        fileName: 'testFileName',
                        type: 'pending',
                        kind: 'unknown',
                    },
                ]
            }
        });
    });

    test('delete property', async () => {
        jest.spyOn(Date, 'now').mockReturnValueOnce(123);
        fetchMock.mockResolvedValue({
            json: () =>
                Promise.resolve({
                    change1: {
                        fileName: 'id_1640106755570_203_propertyChange',
                        content: {
                            property: 'enabled',
                            newValue: true
                        },
                        selector: {
                            id: 'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                            type: 'sap.m.Button'
                        },
                        creation: '2021-12-21T17:12:37.301Z'
                    }
                })
        });

        const service = new ChangeService(
            { rta: rtaMock } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);
        expect(subscribeMock).toHaveBeenCalledTimes(1);
        await subscribeMock.mock.calls[0][0](
            deletePropertyChanges({
                controlId:
                    'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                propertyName: 'enabled',
                fileName: 'id_1640106755570_203_propertyChange'
            })
        );

        expect(fetchMock).toHaveBeenNthCalledWith(2, '/preview/api/changes', {
            body: '{"fileName":"id_1640106755570_203_propertyChange"}',
            headers: { 'Content-Type': 'application/json' },
            method: 'DELETE'
        });
    });
});
