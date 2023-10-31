import * as flexChange from '../../../../src/cpe/changes/flex-change';
import { ChangeService } from '../../../../src/cpe/changes/service';
import { changeProperty, deletePropertyChanges } from '@sap-ux-private/control-property-editor-common';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
describe('SelectionService', () => {
    const applyChangeSpy = jest.spyOn(flexChange, 'applyChange').mockImplementation(() => {
        return Promise.resolve();
    });
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;

    beforeEach(() => {
        rtaMock.attachUndoRedoStackModified = jest.fn() as jest.Mock;
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        fetchMock.mockClear();
    });

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
                        kind: 'valid',
                        fileName: 'id_1640106755570_204_propertyChange',
                        controlName: 'Button',
                        controlId:
                            'v2flex::sap.suite.ui.generic.template.ListReport.view.ListReport::SEPMRA_C_PD_Product--addEntry',
                        propertyName: 'enabled',
                        value: '{i18n>CREATE_OBJECT2}',
                        timestamp: 1640106817301
                    },
                    {
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
                        kind: 'valid',
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
                        timestamp: 1640106877301,
                        controlId: 'SEPMRA_C_PD_Product--template::ListReport::TableToolbar'
                    },
                    {
                        type: 'saved',
                        kind: 'valid',
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
        } {
            const cache = new Map(properties);
            return {
                getElement: jest.fn().mockReturnValue({
                    getMetadata: jest
                        .fn()
                        .mockReturnValue({ getName: jest.fn().mockReturnValue('sap.ui.layout.form.SimpleForm') })
                }),
                getSelector: jest.fn().mockReturnValue({
                    id: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button'
                }),
                getChangeType: (): any => {
                    return cache.get('changeType');
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
        function createCompositeCommand(properties: Map<string, any>): {
            getCommands: () => any;
        } {
            return {
                getCommands: jest.fn().mockReturnValue(subCommands)
            };
        }
        const compositeCommand = [createCompositeCommand(new Map<string, any>([['name', 'composite']]))];

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
        expect(sendActionMock).toHaveBeenCalledTimes(2);
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
                        type: 'pending'
                    },
                    {
                        changeType: 'addSimpleFormField',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        controlName: 'SimpleForm',
                        type: 'pending'
                    }
                ]
            }
        });
    });

    test('undo/redo stack changed', async () => {
        fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });
        function createCommand(properties: Map<string, any>): {
            getProperty: (name: string) => any;
            getElement: () => any;
            getSelector: () => any;
            getChangeType: () => string;
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
                    id: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button'
                }),
                getChangeType: (): any => {
                    return cache.get('changeType');
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
        expect(sendActionMock).toHaveBeenCalledTimes(2);
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
                        type: 'pending',
                        value: 'abc'
                    },
                    {
                        changeType: 'propertyBindingChange',
                        controlId: 'ListReport.view.ListReport::SEPMRA_C_PD_Product--app.my-test-button',
                        isActive: true,
                        propertyName: 'text',
                        controlName: 'Button',
                        type: 'pending',
                        value: '{i18n>DELETE}'
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
                value: 'abc'
            })
        );

        expect(applyChangeSpy.mock.calls[0][1]).toStrictEqual({
            controlId: 'control1',
            controlName: 'button',
            propertyName: 'text',
            value: 'abc'
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
                propertyName: 'enabled'
            })
        );

        expect(fetchMock).toHaveBeenLastCalledWith('/preview/api/changes', {
            body: '{"fileName":"id_1640106755570_203_propertyChange"}',
            headers: { 'Content-Type': 'application/json' },
            method: 'DELETE'
        });
    });
});
