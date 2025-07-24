import type Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import { fetchMock, sapCoreMock, sapMock } from 'mock/window';

import ControlUtils from '../../../../src/adp/control-utils';
import AddFragment from '../../../../src/adp/controllers/AddFragment.controller';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { ValueState } from 'mock/sap/ui/core/library';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import Core from 'sap/ui/core/Core';
import { type AddFragmentChangeContentType } from 'sap/ui/fl/Change';
import { AddFragmentData } from '../../../../src/adp/add-fragment';
import * as addXMLAdditionalInfo from '../../../../src/cpe/additional-change-info/add-xml-additional-info';
import { CommunicationService } from '../../../../src/cpe/communication-service';
import * as adpUtils from '../../../../src/adp/utils';
import { showInfoCenterMessage, MessageBarType } from '@sap-ux-private/control-property-editor-common';

describe('AddFragment', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest.fn().mockReturnValue({ fragments: [] }),
            text: jest.fn(),
            ok: true
        });
    });

    describe('setup', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('fills json model with data', async () => {
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            ControlUtils.getRuntimeControl = jest.fn().mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({
                        'tooltip': {},
                        'customData': {},
                        'layoutData': {},
                        'dependents': {},
                        'dragDropConfig': {},
                        'content': {}
                    }),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content'),
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            });

            ControlUtils.getControlAggregationByName = jest
                .fn()
                .mockReturnValue({ 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} });

            const overlayControl = {
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { content: { actions: { move: null }, domRef: ':sap-domref' } }
                    })
                })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: {}
                    })
                })
            });

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const openSpy = jest.fn();

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: openSpy,
                close: jest.fn()
            } as unknown as Dialog);

            const escapeHandlerCb = (addFragment.dialog.setEscapeHandler as jest.Mock).mock.calls[0][0];

            escapeHandlerCb({ resolve: jest.fn() });

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('fills json model with data and defaultAggregationArrayIndex', async () => {
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            ControlUtils.getRuntimeControl = jest.fn().mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({
                        'tooltip': {},
                        'customData': {},
                        'layoutData': {},
                        'dependents': {},
                        'dragDropConfig': {},
                        'content': {}
                    }),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content'),
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            });

            ControlUtils.getControlAggregationByName = jest
                .fn()
                .mockReturnValue({ 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} });

            const overlayControl = {
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { content: { actions: { move: null }, domRef: ':sap-domref' } }
                    })
                })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: {}
                    })
                })
            });

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE',
                    defaultAggregationArrayIndex: 1
                }
            );

            const openSpy = jest.fn();
            const setPropertySpy = jest.fn();
            addFragment.model = {
                setProperty: setPropertySpy
            } as unknown as JSONModel;
            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: openSpy,
                close: jest.fn()
            } as unknown as Dialog);

            const escapeHandlerCb = (addFragment.dialog.setEscapeHandler as jest.Mock).mock.calls[0][0];

            escapeHandlerCb({ resolve: jest.fn() });

            expect(openSpy).toHaveBeenCalledTimes(1);
            const lastCall = setPropertySpy.mock.calls[setPropertySpy.mock.calls.length - 1];
            expect(lastCall[0]).toBe('/selectedIndex');
            expect(lastCall[1]).toBe(1);
        });

        test('should call showInfoCenterMessage with error when getFragments throws', async () => {
            // Arrange
            const error = new Error('Fragments fetch failed');
            // Mock getFragments to throw
            jest.spyOn(require('../../../../src/adp/api-handler'), 'getFragments').mockRejectedValue(error);
            jest.spyOn(CommunicationService, 'sendAction');

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddFragment(
                'test',
                overlays as unknown as UI5Element,
                {} as any,
                { title: 'Test Title' }
            );

            // Act
            await expect(addFragment.buildDialogData()).rejects.toThrow(error);

            // Assert
            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'Add Fragment Failed',
                    description: error.message,
                    type: MessageBarType.error
                })
            );
        })
    });

    describe('onAggregationChanged', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('on selected aggregations changed', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedItem: jest.fn().mockReturnValue({ getText: jest.fn().mockReturnValue('someText') }),
                    getSelectedKey: jest.fn().mockReturnValue('0')
                })
            };

            ControlUtils.getControlAggregationByName = jest.fn().mockReturnValue({ 0: {} });

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { someText: { specialIndexHandling: 'true' } }
                    })
                })
            });

            addFragment['_runtimeControl'] = {
                getMetadata: jest.fn().mockReturnValue({
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            } as unknown as ManagedObject;

            const setPropertySpy = jest.fn();
            addFragment.model = {
                setProperty: setPropertySpy
            } as unknown as JSONModel;

            const updatedIndexArray = [
                { key: 0, value: 0 },
                { key: 1, value: 1 },
                { key: 2, value: 2 }
            ];

            addFragment.onAggregationChanged(event as unknown as Event);

            expect(setPropertySpy).toHaveBeenCalledTimes(7);
            expect(setPropertySpy).toHaveBeenCalledWith('/selectedAggregation/key', '0');
            expect(setPropertySpy).toHaveBeenCalledWith('/selectedAggregation/value', 'someText');
            expect(setPropertySpy).toHaveBeenCalledWith('/indexHandlingFlag', false);
            expect(setPropertySpy).toHaveBeenCalledWith('/specialIndexHandlingIcon', true);
            expect(setPropertySpy).toHaveBeenCalledWith(
                '/iconTooltip',
                `Index is defined by special logic of Toolbar and can't be set here`
            );
            expect(setPropertySpy).toHaveBeenCalledWith('/index', updatedIndexArray);
            expect(setPropertySpy).toHaveBeenCalledWith('/selectedIndex', 2);
        });
    });

    describe('handleDialogClose', () => {
        test('should close dialog', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const closeSpy = jest.fn();

            addFragment.dialog = {
                close: closeSpy,
                destroy: jest.fn()
            } as unknown as Dialog;

            addFragment.handleDialogClose();

            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('onFragmentNameInputChange', () => {
        const testModel = {
            setProperty: jest.fn(),
            getProperty: jest.fn().mockReturnValue([{ fragmentName: 'Delete.fragment.xml' }])
        } as unknown as JSONModel;

        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('sets error when fragment with the same named already exists', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Delete'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name is empty', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue(''),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.None);
        });

        test('sets error when the fragment name has special characters', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share 2$5!'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name contains a whitespace at the end', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('samplename '),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name exceeds 64 characters', () => {
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest
                        .fn()
                        .mockReturnValue('thisisverylongnamethisisverylongnamethisisverylongnamethisisveryl'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('does not crash if composite command exists in command stack', () => {
            jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

            const command = {
                getCommandStack: jest.fn().mockReturnValue([])
            };

            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([command])
            });

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('New'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Success);
        });

        test('sets error when the fragment name already exists in command stack', () => {
            jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(true);
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            const change = {
                content: {
                    fragmentPath: 'fragments/New.fragment.xml'
                }
            };
            const command = {
                getProperty: jest.fn().mockReturnValue(''),
                getPreparedChange: jest.fn().mockReturnValue({ getDefinition: jest.fn().mockReturnValue(change) })
            };

            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([command])
            });

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('New'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets error when the fragment name already exists in command stack (command is "composite")', () => {
            jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(true);
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            const change = {
                content: {
                    fragmentPath: 'fragments/New.fragment.xml'
                }
            };
            const command = {
                getProperty: jest.fn().mockReturnValue('addXMLAtExtensionPoint'),
                getPreparedChange: jest.fn().mockReturnValue({ getDefinition: jest.fn().mockReturnValue(change) })
            };
            const compositeCommand = {
                getProperty: jest.fn().mockReturnValue('composite'),
                getCommands: jest.fn().mockReturnValue([command])
            };

            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([compositeCommand])
            });

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('New'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Error);
        });

        test('sets create button to true when the fragment name is valid', () => {
            jest.spyOn(adpUtils, 'checkForExistingChange').mockReturnValue(false);
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            rtaMock.getCommandStack.mockReturnValue({
                getCommands: jest.fn().mockReturnValue([])
            });
            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                {} as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const valueStateSpy = jest.fn().mockReturnValue({ setValueStateText: jest.fn() });
            const event = {
                getSource: jest.fn().mockReturnValue({
                    getValue: jest.fn().mockReturnValue('Share'),
                    setValueState: valueStateSpy
                })
            };

            addFragment.model = testModel;

            addFragment.dialog = {
                getBeginButton: jest
                    .fn()
                    .mockReturnValue({ setEnabled: jest.fn().mockReturnValue({ rerender: jest.fn() }) })
            } as unknown as Dialog;

            addFragment.onFragmentNameInputChange(event as unknown as Event);

            expect(valueStateSpy).toHaveBeenCalledWith(ValueState.Success);
        });
    });

    describe('onCreateBtnPress', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });
        const testModel = {
            getProperty: jest.fn().mockReturnValueOnce('Share').mockReturnValueOnce('0').mockReturnValueOnce('content'),
            setProperty: jest.fn()
        } as unknown as JSONModel;
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        test('creates new fragment and a change', async () => {
            const mockSendAction = jest.spyOn(CommunicationService, 'sendAction');
            sapMock.ui.version = '1.71.62';
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            sapCoreMock.byId.mockReturnValue({});
            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({}),
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content')
                }),
                getId: jest.fn().mockReturnValue('some-id')
            } as unknown as ManagedObject);
            jest.spyOn(addXMLAdditionalInfo, 'getFragmentTemplateName').mockReturnValue('templateName');

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                overlays as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'ADP_ADD_FRAGMENT_DIALOG_TITLE'
                }
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            addFragment.model = testModel;

            CommandFactory.getCommandFor = jest.fn().mockReturnValue({
                _oPreparedChange: {
                    _oDefinition: { moduleName: 'adp/app/changes/fragments/Share.fragment.xml' },
                    setModuleName: jest.fn()
                }
            });

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    id: 'id',
                    reference: 'reference',
                    namespace: 'namespace',
                    layer: 'layer'
                }),
                text: jest.fn().mockReturnValue('XML Fragment was created!'),
                ok: true
            });

            addFragment.handleDialogClose = jest.fn();

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await addFragment.onCreateBtnPress(event as unknown as Event);

            expect(executeSpy).toHaveBeenCalledWith({
                _oPreparedChange: {
                    _oDefinition: {
                        moduleName: 'adp/app/changes/fragments/Share.fragment.xml'
                    },
                    setModuleName: expect.any(Function)
                }
            });
            expect(CommandFactory.getCommandFor.mock.calls[0][4].selector).toBeUndefined();
            expect(mockSendAction).toHaveBeenCalled();
            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'Create XML Fragment',
                    description: 'Note: The `Share.fragment.xml` fragment will be created once you save the change.',
                    type: MessageBarType.info
                })
            );
        });

        test('add header field fragment and a change if targetAggregation is items and not a dynamic header', async () => {
            sapMock.ui.version = '1.71.62';
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                overlays as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD',
                    aggregation: 'items'
                }
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            const testModel = {
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce('Share')
                    .mockReturnValueOnce('0')
                    .mockReturnValueOnce('items'),
                setProperty: jest.fn()
            } as unknown as JSONModel;
            addFragment.model = testModel;

            const dummyContent: AddFragmentChangeContentType = {
                fragmentPath: 'dummyPath',
                index: 1,
                targetAggregation: 'items'
            };

            const setContentSpy = jest.fn();
            const commandForSpy = jest.fn().mockReturnValue({
                _oPreparedChange: {
                    _oDefinition: { moduleName: 'adp/app/changes/fragments/Share.fragment.xml' },
                    setModuleName: jest.fn()
                },
                getPreparedChange: jest.fn().mockReturnValue({
                    getContent: jest.fn().mockReturnValue(dummyContent),
                    setContent: setContentSpy
                })
            });
            CommandFactory.getCommandFor = commandForSpy;

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    id: 'id',
                    reference: 'reference',
                    namespace: 'namespace',
                    layer: 'layer'
                }),
                text: jest.fn().mockReturnValue('XML Fragment was created!'),
                ok: true
            });

            jest.spyOn(sap.ui, 'getCore').mockReturnValue({
                byId: jest.fn().mockReturnValue({})
            } as unknown as Core);

            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({}),
                    getName: jest.fn().mockReturnValue('sap.m.FlexBox')
                }),
                getParent: jest.fn().mockReturnValue({
                    getMetadata: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('No.Dynamic.ObjectPageDynamicHeaderContent')
                    })
                }),
                getId: jest.fn().mockReturnValue('some-id')
            } as unknown as ManagedObject);
            jest.spyOn(addXMLAdditionalInfo, 'getFragmentTemplateName').mockReturnValue('');

            addFragment.handleDialogClose = jest.fn();

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await addFragment.onCreateBtnPress(event as unknown as Event);

            expect(executeSpy).toHaveBeenCalledWith({
                _oPreparedChange: {
                    _oDefinition: {
                        moduleName: 'adp/app/changes/fragments/Share.fragment.xml'
                    },
                    setModuleName: expect.any(Function)
                },
                getPreparedChange: expect.any(Function)
            });
        });

        test('add header field fragment and a change if targetAggregation is items and not a dynamic header', async () => {
            sapMock.ui.version = '1.71.62';
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddFragment(
                'adp.extension.controllers.AddFragment',
                overlays as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    title: 'QUICK_ACTION_OP_ADD_HEADER_FIELD',
                    aggregation: 'items'
                }
            );

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };

            const testModel = {
                getProperty: jest
                    .fn()
                    .mockReturnValueOnce('Share')
                    .mockReturnValueOnce('0')
                    .mockReturnValueOnce('items'),
                setProperty: jest.fn()
            } as unknown as JSONModel;
            addFragment.model = testModel;

            const dummyContent: AddFragmentChangeContentType = {
                fragmentPath: 'dummyPath',
                index: 1,
                targetAggregation: 'items'
            };

            const setContentSpy = jest.fn();
            const commandForSpy = jest.fn().mockReturnValue({
                _oPreparedChange: {
                    _oDefinition: { moduleName: 'adp/app/changes/fragments/Share.fragment.xml' },
                    setModuleName: jest.fn()
                },
                getPreparedChange: jest.fn().mockReturnValue({
                    getContent: jest.fn().mockReturnValue(dummyContent),
                    setContent: setContentSpy
                })
            });
            CommandFactory.getCommandFor = commandForSpy;

            fetchMock.mockResolvedValue({
                json: jest.fn().mockReturnValue({
                    id: 'id',
                    reference: 'reference',
                    namespace: 'namespace',
                    layer: 'layer'
                }),
                text: jest.fn().mockReturnValue('XML Fragment was created!'),
                ok: true
            });

            jest.spyOn(sap.ui, 'getCore').mockReturnValue({
                byId: jest.fn().mockReturnValue({})
            } as unknown as Core);

            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({}),
                    getName: jest.fn().mockReturnValue('sap.m.FlexBox')
                }),
                getParent: jest.fn().mockReturnValue({
                    getMetadata: jest.fn().mockReturnValue({
                        getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout')
                    })
                }),
                getId: jest.fn().mockReturnValue('some-id')
            } as unknown as ManagedObject);
            jest.spyOn(addXMLAdditionalInfo, 'getFragmentTemplateName').mockReturnValue('');

            addFragment.handleDialogClose = jest.fn();

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await addFragment.onCreateBtnPress(event as unknown as Event);

            expect(executeSpy).toHaveBeenCalledWith({
                _oPreparedChange: {
                    _oDefinition: {
                        moduleName: 'adp/app/changes/fragments/Share.fragment.xml'
                    },
                    setModuleName: expect.any(Function)
                },
                getPreparedChange: expect.any(Function)
            });
        });

        test('resolve deffered data promise when passed', async () => {
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };
            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({}),
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content')
                }),
                getId: jest.fn().mockReturnValue('some-id')
            } as unknown as ManagedObject);
            jest.spyOn(addXMLAdditionalInfo, 'getFragmentTemplateName').mockReturnValue('templateName');
            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            };
            const resolveSpy = jest.fn();
            const mockData = {
                deferred: {
                    resolve: resolveSpy
                }
            };
            const addFragment = new AddFragment(
                'TestName',
                overlays as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                { title: 'Test Title' },
                mockData as unknown as AddFragmentData
            );
            addFragment.model = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValueOnce('test')
            } as unknown as JSONModel;

            addFragment.handleDialogClose = jest.fn();

            await addFragment.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            await addFragment.onCreateBtnPress(event as unknown as Event);

            expect(mockData.deferred.resolve).toHaveBeenCalledWith({
                fragment: `<core:FragmentDefinition xmlns:core='sap.ui.core'></core:FragmentDefinition>`,
                fragmentPath: `fragments/test.fragment.xml`,
                index: 0,
                targetAggregation: 'content'
            });
        });
    });
});
