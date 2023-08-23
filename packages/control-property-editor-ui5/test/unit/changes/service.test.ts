import { ID } from 'sap/ui/core/library';
import * as flexChange from '../../../src/changes/flexChange';
import { ChangeService } from '../../../src/changes/service';
import { changeProperty, deletePropertyChanges } from '@sap-ux/control-property-editor-common';

describe('SelectionService', () => {
    const applyChangeSpy = jest.spyOn(flexChange, 'applyChange').mockImplementation(() => {
        return Promise.resolve();
    });

    test('read workspace changes', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
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
                        },
                        change2: {
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
            })
        );
        jest.spyOn(Date, 'now').mockReturnValueOnce(123);
        const cache = new Map();
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const attachUndoRedoStackModified = jest.fn();
        const sendActionMock = jest.fn();
        const rta = {
            attachUndoRedoStackModified
        };
        const service = new ChangeService(
            { rta } as any,
            { getControlById: getControlByIdSpy } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, jest.fn());
        expect(global.fetch).toHaveBeenCalledWith('/FioriTools/api/getChanges?_=123');
        expect(sendActionMock).toHaveBeenCalledWith({
            type: '[ext] change-stack-modified',
            payload: {
                pending: [],
                saved: [
                    {
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
                        fileName: 'id_1640106755570_204_propertyChange',
                        timestamp: 1640106817301
                    },
                    {
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
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () =>
                    Promise.resolve({
                        change2: {
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
                            fileName: 'unknown',
                            creation: '2021-12-21T17:14:37.301Z'
                        }
                    })
            })
        );
        jest.spyOn(Date, 'now').mockReturnValueOnce(123);
        const cache = new Map();
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const attachUndoRedoStackModified = jest.fn();
        const sendActionMock = jest.fn();
        const rta = {
            attachUndoRedoStackModified
        };
        const service = new ChangeService(
            { rta } as any,
            { getControlById: getControlByIdSpy } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, jest.fn());
        expect(global.fetch).toHaveBeenCalledWith('/FioriTools/api/getChanges?_=123');
        expect(sendActionMock).toHaveBeenCalledWith({
            type: '[ext] change-stack-modified',
            payload: {
                pending: [],
                saved: [
                    {
                        type: 'saved',
                        kind: 'unknown',
                        fileName: 'unknown',
                        timestamp: 1640106877301
                    },
                    {
                        type: 'saved',
                        kind: 'valid',
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

    test('undo/redo stack changed', async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({})
            })
        );
        const cache = new Map();
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const attachUndoRedoStackModified = jest.fn();
        const sendActionMock = jest.fn();
        const subscribeMock = jest.fn();
        function createCommand(properties: Map<string, any>): {
            getProperty: (name: string) => any;
            getElement: () => any;
        } {
            const cache = new Map(properties);
            return {
                getProperty: (name: string): any => {
                    return cache.get(name);
                },
                getElement: jest.fn().mockReturnValue({
                    getMetadata: jest.fn().mockReturnValue({ getName: jest.fn().mockReturnValue('sap.m.Button') })
                })
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
        const rta = {
            attachUndoRedoStackModified,
            getCommandStack: jest.fn().mockReturnValue({
                getCommands: jest.fn().mockReturnValue(commands),
                getAllExecutedCommands: jest.fn().mockReturnValue(commands)
            })
        };
        const service = new ChangeService(
            { rta } as any,
            { getControlById: getControlByIdSpy } as any,
            {
                applyControlPropertyChange: jest.fn()
            } as any
        );

        await service.init(sendActionMock, subscribeMock);

        await attachUndoRedoStackModified.mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenCalledTimes(2);
        expect(sendActionMock).toHaveBeenNthCalledWith(2, {
            type: '[ext] change-stack-modified',
            payload: {
                saved: [],
                pending: [
                    {
                        controlId: 'control1',
                        isActive: true,
                        propertyName: 'text',
                        controlName: 'Button',
                        type: 'pending',
                        value: 'abc'
                    },
                    {
                        controlId: 'control1',
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
        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({})
            })
        );
        const cache = new Map();
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const attachUndoRedoStackModified = jest.fn();
        const sendActionMock = jest.fn();
        const subscribeMock = jest.fn();

        const rta = {
            attachUndoRedoStackModified
        };
        const service = new ChangeService(
            { rta } as any,
            { getControlById: getControlByIdSpy } as any,
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
        global.fetch = jest.fn(() =>
            Promise.resolve({
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
            })
        );
        const cache = new Map();
        const getControlByIdSpy = jest.fn().mockImplementation((id: ID) => {
            return cache.get(id);
        });
        const attachUndoRedoStackModified = jest.fn();
        const sendActionMock = jest.fn();
        const subscribeMock = jest.fn();

        const rta = {
            attachUndoRedoStackModified
        };
        const service = new ChangeService(
            { rta } as any,
            { getControlById: getControlByIdSpy } as any,
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

        expect(global.fetch).toHaveBeenNthCalledWith(2, '/FioriTools/api/removeChanges', {
            body: '{"fileName":"id_1640106755570_203_propertyChange"}',
            headers: { 'Content-Type': 'application/json' },
            method: 'DELETE'
        });
    });
});
