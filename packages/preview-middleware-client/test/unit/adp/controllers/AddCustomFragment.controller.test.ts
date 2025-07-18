import type Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import { fetchMock, sapCoreMock, sapMock } from 'mock/window';

import ControlUtils from '../../../../src/adp/control-utils';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { ValueState } from 'mock/sap/ui/core/library';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import * as addXMLAdditionalInfo from '../../../../src/cpe/additional-change-info/add-xml-additional-info';
import { CommunicationService } from '../../../../src/cpe/communication-service';
import * as adpUtils from '../../../../src/adp/utils';
import AddCustomFragment from 'open/ux/preview/client/adp/controllers/AddCustomFragment.controller';

describe('AddCustomFragment', () => {
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

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId'
                    },
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
    });

    describe('handleDialogClose', () => {
        test('should close dialog', () => {
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        projectId: 'test',
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId'
                    },
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
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId'
                    },
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
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                     propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId'
                    },
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
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        projectId: 'test',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId'
                    },
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
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        projectId: 'test',
                        appType: 'fe-v4',
                        pageId: 'somePageId'
                    },
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
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId',
                        projectId: 'test'
                    },
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

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId',
                        projectId: 'test'
                    },
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

            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId',
                        projectId: 'test'
                    },
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
            rtaMock.getFlexSettings.mockReturnValue({
                projectId: 'adp.app'
            });
            const overlays = {
                getId: jest.fn().mockReturnValue('some-id')
            };

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                rtaMock,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId',
                        projectId: 'test'
                    },
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

            const addFragment = new AddCustomFragment(
                'adp.extension.controllers.AddCustomFragment',
                overlays as unknown as UI5Element,
                rtaMock as unknown as RuntimeAuthoring,
                {
                    propertyPath: 'content/body/sections/',
                    appDescriptor: {
                        anchor: 'someAnchor',
                        appComponent: {} as any,
                        appType: 'fe-v4',
                        pageId: 'somePageId',
                        projectId: 'test'
                    },
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
        });
    });
});
