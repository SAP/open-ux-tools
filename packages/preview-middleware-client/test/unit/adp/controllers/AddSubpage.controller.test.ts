import type Dialog from 'sap/m/Dialog';
import Event from 'sap/ui/base/Event';
import type UI5Element from 'sap/ui/core/Element';
import JSONModel from 'sap/ui/model/json/JSONModel';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';
import type AppComponentV4 from 'sap/fe/core/AppComponent';
import type AppComponentV2 from 'sap/suite/ui/generic/template/lib/AppComponent';

import CommandFactory from 'mock/sap/ui/rta/command/CommandFactory';
import { fetchMock, sapCoreMock } from 'mock/window';

import ControlUtils from '../../../../src/adp/control-utils';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { ValueState } from 'mock/sap/ui/core/library';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import type ManagedObject from 'sap/ui/base/ManagedObject';
import SimpleForm from 'sap/ui/layout/form';
import Control from 'sap/ui/core/Control';
import AddSubpage from 'open/ux/preview/client/adp/controllers/AddSubpage.controller';
import { CommunicationService } from 'open/ux/preview/client/cpe/communication-service';
import { setApplicationRequiresReload } from '@sap-ux-private/control-property-editor-common';

const mocks = {
    setValueStateMock: jest.fn(),
    setValueStateTextMock: jest.fn()
};

/**
 * Simulates various values returns in sequential calls
 * the last value stays persistent and is returned in further calls
 * @param v - value or array of values
 * @returns jest mock function returning provided values, the last value stays persistent and is returned in further calls
 */
const nCallsMock = <T>(v: T | T[]) => {
    const values = Array.isArray(v) ? v : [v];
    return values.reduce((acc, value, idx) => {
        if (idx === values.length - 1) {
            acc.mockReturnValue(value);
        } else {
            acc.mockReturnValueOnce(value);
        }
        return acc;
    }, jest.fn());
};

type StateType = ValueState | keyof typeof ValueState;
const mockFormInput = (
    isInput: boolean,
    values: String | String[] = '',
    states?: StateType | StateType[],
    stateTexts?: string | string[]
) => ({
    isA: jest.fn().mockReturnValue(isInput),
    getValue: nCallsMock(values),
    getValueState: nCallsMock(states),
    getValueStateText: nCallsMock(stateTexts),
    setValueState: mocks.setValueStateMock
});

describe('AddSubpage controller', () => {
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
                    getAllAggregations: jest.fn().mockReturnValue({}),
                    getDefaultAggregationName: jest.fn().mockReturnValue(''),
                    getName: jest.fn().mockReturnValue('Page')
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

            const addSubpage = new AddSubpage(
                'adp.extension.controllers.AddSubpage',
                overlays as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'QUICK_ACTION_ADD_SUBPAGE',
                    navProperties: [
                        { entitySet: 'Bookings', navProperty: 'to_Booking' },
                        { entitySet: 'Airlines', navProperty: 'to_Airline' }
                    ],
                    appReference: 'dummyApp',
                    pageDescriptor: {
                        appType: 'fe-v2',
                        appComponent: {} as unknown as AppComponentV2,
                        entitySet: 'Travels',
                        pageType: 'sap.suite.ui.generic.template.ObjectPage'
                    }
                }
            );

            const openSpy = jest.fn();

            const setPropertySpy = jest.fn();
            const getTestModel = () =>
                ({
                    setProperty: setPropertySpy,
                    getProperty: jest.fn().mockImplementation((propName: string) => {
                        switch (propName) {
                            case '/navigationData':
                                return [
                                    { entitySet: 'Bookings', navProperty: 'to_Booking' },
                                    { entitySet: 'Airlines', navProperty: 'to_Airline' }
                                ];
                        }
                    })
                } as unknown as JSONModel);
            addSubpage.model = getTestModel();

            const dialogMock = {
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: openSpy,
                close: jest.fn()
            } as unknown as Dialog;
            await addSubpage.setup(dialogMock);

            const escapeHandlerCb = (addSubpage.dialog.setEscapeHandler as jest.Mock).mock.calls[0][0];

            escapeHandlerCb({ resolve: jest.fn() });

            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(setPropertySpy.mock.calls).toStrictEqual([
                [
                    '/pageTypeOptions',
                    [
                        {
                            'key': 'ObjectPage',
                            'value': 'Object Page'
                        },
                        {
                            'key': 'CustomPage',
                            'value': 'Custom Page'
                        }
                    ]
                ],
                [
                    '/selectedPageType',
                    {
                        'key': 'ObjectPage',
                        'value': 'Object Page'
                    }
                ],
                [
                    '/navigationOptions',
                    [
                        {
                            'key': 'to_Booking',
                            'value': 'Bookings (to_Booking)'
                        },
                        {
                            'key': 'to_Airline',
                            'value': 'Airlines (to_Airline)'
                        }
                    ]
                ],
                [
                    '/selectedNavigation',
                    {
                        'key': 'to_Booking',
                        'value': 'Bookings (to_Booking)'
                    }
                ]
            ]);
        });
    });

    describe('handleDialogClose', () => {
        test('should close dialog', () => {
            const addSubpage = new AddSubpage(
                'adp.extension.controllers.AddSubpage',
                {} as unknown as UI5Element,
                {} as unknown as RuntimeAuthoring,
                {
                    title: 'QUICK_ACTION_ADD_SUBPAGE',
                    appReference: 'dummyApp',
                    navProperties: [
                        { entitySet: 'Bookings', navProperty: 'to_Booking' },
                        { entitySet: 'Airlines', navProperty: 'to_Airline' }
                    ],
                    pageDescriptor: {
                        appType: 'fe-v2',
                        appComponent: {} as unknown as AppComponentV2,
                        entitySet: 'Travels',
                        pageType: 'sap.suite.ui.generic.template.ObjectPage'
                    }
                }
            );

            const closeSpy = jest.fn();

            addSubpage.dialog = {
                close: closeSpy,
                destroy: jest.fn()
            } as unknown as Dialog;

            addSubpage.handleDialogClose();

            expect(closeSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('on input changes', () => {
        const getTestModel = () =>
            ({
                setProperty: jest.fn(),
                getProperty: jest.fn()
            } as unknown as JSONModel);

        let addSubpage: AddSubpage;
        let beginBtnSetEnabledMock: jest.Mock<any, any, any>;

        const createDialog = (content: Control[], rtaMock: RuntimeAuthoring = {} as unknown as RuntimeAuthoring) => {
            addSubpage = new AddSubpage(
                'adp.extension.controllers.AddSubpage',
                {
                    getId: jest.fn().mockReturnValue('some-id')
                } as unknown as UI5Element,
                rtaMock,
                {
                    title: 'QUICK_ACTION_ADD_SUBPAGE',
                    appReference: 'dummyApp',
                    navProperties: [
                        { entitySet: 'Bookings', navProperty: 'to_Booking' },
                        { entitySet: 'Airlines', navProperty: 'to_Airline' }
                    ],
                    pageDescriptor: {
                        appType: 'fe-v2',
                        appComponent: {} as unknown as AppComponentV2,
                        entitySet: 'Travels',
                        pageType: 'sap.suite.ui.generic.template.ObjectPage'
                    }
                }
            );
            addSubpage.model = getTestModel();
            beginBtnSetEnabledMock = jest.fn().mockReturnValue({ rerender: jest.fn() });
            addSubpage.dialog = {
                getBeginButton: jest.fn().mockReturnValue({ setEnabled: beginBtnSetEnabledMock }),
                getContent: jest.fn().mockReturnValue([
                    {
                        getContent: jest.fn().mockReturnValue(content)
                    } as unknown as SimpleForm<Control[]>
                ])
            } as unknown as Dialog;
        };

        beforeEach(() => {
            mocks.setValueStateTextMock = jest.fn();
            mocks.setValueStateMock = jest.fn().mockReturnValue({
                setValueStateText: mocks.setValueStateTextMock
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        const setPropertySpy = jest.fn();
        const testModel = {
            getProperty: jest.fn().mockImplementation((name: string) => {
                const props: Record<string, any> = {
                    '/navigationData': [
                        { entitySet: 'Bookings', navProperty: 'to_Booking' },
                        { entitySet: 'Airlines', navProperty: 'to_Airline' }
                    ],
                    '/selectedNavigation/key': 'to_Booking',
                    '/appType': 'fe-v2',
                    '/pageType': 'ObjectPageType',
                    '/appReference': 'app',
                    '/currentEntitySet': 'Travel'
                };
                return props[name];
            }),
            setProperty: setPropertySpy
        } as unknown as JSONModel;
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);

        test('onNavigationChange', async () => {
            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            sapCoreMock.byId.mockReturnValue({});
            // const getAggregationMock = jest.fn().mockReturnValue([{ dummyAggregation: true }]);
            const runtimeControlMock = {
                getMetadata: jest.fn().mockReturnValue({
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getAllAggregations: jest.fn().mockReturnValue([])
                })
            } as unknown as ManagedObject;
            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue(runtimeControlMock);

            createDialog(
                [
                    mockFormInput(true, 'ObjectPage', ValueState.Success),
                    mockFormInput(true, 'to_Booking', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addSubpage.model = testModel;

            addSubpage.handleDialogClose = jest.fn();

            await addSubpage.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            const event = {
                getSource: jest.fn().mockReturnValue({
                    getSelectedKey: jest.fn().mockReturnValue('to_Airline')
                })
            } as unknown as Event;

            setPropertySpy.mockClear();
            await addSubpage.onNavigationChange(event);

            expect(setPropertySpy.mock.calls[0]).toStrictEqual(['/selectedNavigation/key', 'to_Airline']);
        });
    });

    describe('onCreateBtnPress', () => {
        let addSubpage: AddSubpage;

        beforeEach(() => {
            mocks.setValueStateTextMock = jest.fn();
            mocks.setValueStateMock = jest.fn().mockReturnValue({
                setValueStateText: mocks.setValueStateTextMock
            });
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        const testCases: {
            appType: 'v2' | 'v4';
            routePattern?: string;
            expectedPattern?: string;
        }[] = [
            {
                appType: 'v2'
            },
            {
                appType: 'v4',
                routePattern: ':?query:',
                expectedPattern: 'Bookings({BookingsKey}):?query:'
            },
            {
                appType: 'v4',
                routePattern: 'Travel({key}):?query:',
                expectedPattern: 'Travel({key})/to_Booking({BookingsKey}):?query:'
            }
        ];

        test.each(testCases)('calls rta command to add new subpage (%s)', async (testCase) => {
            CommandFactory.getCommandFor.mockClear();
            const getTestModel = () =>
                ({
                    setProperty: jest.fn(),
                    getProperty: jest.fn()
                } as unknown as JSONModel);

            let beginBtnSetEnabledMock: jest.Mock<any, any, any>;
            const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
            const testModel = {
                getProperty: jest.fn().mockImplementation((name: string) => {
                    const props: Record<string, any> = {
                        '/navigationData': [
                            { entitySet: 'Bookings', navProperty: 'to_Booking' },
                            { entitySet: 'Airlines', navProperty: 'to_Airline' }
                        ],
                        '/selectedNavigation/key': 'to_Booking',
                        '/currentEntitySet': 'Travels'
                    };
                    return props[name];
                }),
                setProperty: jest.fn()
            } as unknown as JSONModel;

            const createDialog = (
                content: Control[],
                rtaMock: RuntimeAuthoring = {} as unknown as RuntimeAuthoring
            ) => {
                addSubpage = new AddSubpage(
                    'adp.extension.controllers.AddSubpage',
                    {
                        getId: jest.fn().mockReturnValue('some-id')
                    } as unknown as UI5Element,
                    rtaMock,
                    {
                        title: 'QUICK_ACTION_ADD_SUBPAGE',
                        appReference: 'dummyApp',
                        navProperties: [
                            { entitySet: 'Bookings', navProperty: 'to_Booking' },
                            { entitySet: 'Airlines', navProperty: 'to_Airline' }
                        ],
                        pageDescriptor:
                            testCase.appType === 'v2'
                                ? {
                                      appType: 'fe-v2',
                                      appComponent: { appComponentType: testCase.appType } as unknown as AppComponentV2,
                                      entitySet: 'Travels',
                                      pageType: 'sap.suite.ui.generic.template.ObjectPage'
                                  }
                                : {
                                      appType: 'fe-v4',
                                      appComponent: { appComponentType: testCase.appType } as unknown as AppComponentV4,
                                      pageId: 'CurrentPageId',
                                      routePattern: testCase.routePattern ?? ''
                                  }
                    }
                );
                addSubpage.model = getTestModel();
                beginBtnSetEnabledMock = jest.fn().mockReturnValue({ rerender: jest.fn() });
                addSubpage.dialog = {
                    getBeginButton: jest.fn().mockReturnValue({ setEnabled: beginBtnSetEnabledMock }),
                    getContent: jest.fn().mockReturnValue([
                        {
                            getContent: jest.fn().mockReturnValue(content)
                        } as unknown as SimpleForm<Control[]>
                    ])
                } as unknown as Dialog;
            };

            const executeSpy = jest.fn();
            rtaMock.getCommandStack.mockReturnValue({
                pushAndExecute: executeSpy
            });
            rtaMock.getFlexSettings.mockReturnValue({ projectId: 'adp.app' });

            sapCoreMock.byId.mockReturnValue({});
            // const getAggregationMock = jest.fn().mockReturnValue([{ dummyAggregation: true }]);
            const runtimeControlMock = {
                getMetadata: jest.fn().mockReturnValue({
                    getName: jest.fn().mockReturnValue('sap.uxap.ObjectPageLayout'),
                    getAllAggregations: jest.fn().mockReturnValue([])
                })
            } as unknown as ManagedObject;
            jest.spyOn(ControlUtils, 'getRuntimeControl').mockReturnValue(runtimeControlMock);

            createDialog(
                [
                    mockFormInput(true, 'ObjectPage', ValueState.Success),
                    mockFormInput(true, 'to_Booking', ValueState.Success)
                ] as unknown as Control[],
                rtaMock
            );

            addSubpage.model = testModel;

            addSubpage.handleDialogClose = jest.fn();

            await addSubpage.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: jest.fn(),
                close: jest.fn()
            } as unknown as Dialog);

            const event = {
                getSource: jest.fn().mockReturnValue({
                    setEnabled: jest.fn()
                })
            } as unknown as Event;

            const sendActionSpy = jest.spyOn(CommunicationService, 'sendAction');

            await addSubpage.onCreateBtnPress(event);

            expect(executeSpy).toHaveBeenCalledTimes(1);
            expect(sendActionSpy).toHaveBeenCalledWith(setApplicationRequiresReload(true));

            const commandCall = CommandFactory.getCommandFor.mock.calls[0];

            expect(commandCall[0]).toEqual(runtimeControlMock);
            expect(commandCall[1]).toBe('appDescriptor');
            expect(commandCall[2]).toStrictEqual(
                testCase.appType === 'v2'
                    ? {
                          'appComponent': { appComponentType: testCase.appType },
                          'changeType': 'appdescr_ui_generic_app_addNewObjectPage',
                          'parameters': {
                              'childPage': {
                                  'definition': {
                                      'entitySet': 'Bookings',
                                      'navigationProperty': 'to_Booking'
                                  },
                                  'id': 'ObjectPage|to_Booking'
                              },
                              'parentPage': {
                                  'component': 'sap.suite.ui.generic.template.ObjectPage',
                                  'entitySet': 'Travels'
                              }
                          },
                          'reference': 'dummyApp'
                      }
                    : {
                          'appComponent': { appComponentType: testCase.appType },
                          'changeType': 'appdescr_fe_addNewPage',
                          'reference': 'dummyApp',
                          'parameters': {
                              'sourcePage': {
                                  'id': 'CurrentPageId',
                                  'navigationSource': 'to_Booking'
                              },
                              'targetPage': {
                                  'type': 'Component',
                                  'id': 'BookingsObjectPage',
                                  'name': 'sap.fe.templates.ObjectPage',
                                  'routePattern': testCase.expectedPattern,
                                  'settings': {
                                      'contextPath': '/Bookings',
                                      'controlConfiguration': {},
                                      'editableHeaderContent': false,
                                      'entitySet': 'Bookings',
                                      'pageLayout': ''
                                  }
                              }
                          }
                      }
            );
        });
    });
});
