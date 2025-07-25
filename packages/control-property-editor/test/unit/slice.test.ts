import {
    applicationModeChanged,
    changeStackModified,
    iconsLoaded,
    propertyChanged,
    propertyChangeFailed,
    PropertyType,
    quickActionListChanged,
    reloadApplication,
    requestControlContextMenu,
    SCENARIO,
    setApplicationRequiresReload,
    storageFileChanged,
    toggleAppPreviewVisibility,
    updateQuickAction
} from '@sap-ux-private/control-property-editor-common';

import { DeviceType } from '../../src/devices';
import reducer, {
    changeDeviceType,
    changeProperty,
    fileChanged,
    FilterName,
    filterNodes,
    setFeatureToggles,
    setProjectScenario
} from '../../src/slice';

describe('main redux slice', () => {
    describe('property changed', () => {
        test('existing property', () => {
            expect(
                reducer(
                    {
                        selectedControl: {
                            id: 'control1',
                            properties: [
                                {
                                    name: 'text',
                                    value: 'old value'
                                }
                            ]
                        }
                    } as any,
                    propertyChanged({
                        controlId: 'control1',
                        propertyName: 'text',
                        newValue: 'new text'
                    })
                )
            ).toStrictEqual({
                selectedControl: {
                    id: 'control1',
                    properties: [
                        {
                            name: 'text',
                            value: 'new text'
                        }
                    ]
                }
            });
        });

        test('propertyChangeFailed', () => {
            expect(
                reducer(
                    {
                        selectedControl: {
                            id: 'control1',
                            properties: [
                                {
                                    name: 'text',
                                    value: 'old value'
                                }
                            ]
                        }
                    } as any,
                    propertyChangeFailed({
                        controlId: 'control1',
                        propertyName: 'text',
                        errorMessage: 'change failed'
                    })
                )
            ).toStrictEqual({
                selectedControl: {
                    id: 'control1',
                    properties: [{ errorMessage: 'change failed', name: 'text', value: 'old value' }]
                }
            });
        });

        test('changeProperty', () => {
            expect(
                reducer(
                    {
                        selectedControl: {
                            id: 'control1',
                            type: 'string',
                            properties: [
                                {
                                    name: 'text',
                                    value: 'old value'
                                }
                            ]
                        }
                    } as any,
                    changeProperty({
                        controlId: 'control1',
                        controlName: 'Button',
                        propertyType: PropertyType.ControlProperty,
                        propertyName: 'text',
                        value: 'change text',
                        changeType: 'propertyChange'
                    })
                )
            ).toStrictEqual({
                selectedControl: {
                    id: 'control1',
                    properties: [
                        {
                            errorMessage: '',
                            name: 'text',
                            value: 'change text'
                        }
                    ],
                    type: 'string'
                }
            });
        });

        test('non existing property', () => {
            expect(
                reducer(
                    {
                        selectedControl: {
                            id: 'control1',
                            properties: [
                                {
                                    name: 'text',
                                    value: 'old value'
                                }
                            ]
                        }
                    } as any,
                    propertyChanged({
                        controlId: 'control1',
                        propertyName: 'does not exist',
                        newValue: 'new text'
                    })
                )
            ).toStrictEqual({
                selectedControl: {
                    id: 'control1',
                    properties: [
                        {
                            name: 'text',
                            value: 'old value'
                        }
                    ]
                }
            });
        });

        test('changeStackModified', () => {
            expect(
                reducer(
                    {
                        changes: {
                            saved: [],
                            pending: [],
                            controls: [] // make sure that old value is not reused
                        }
                    } as any,
                    changeStackModified({
                        pending: [
                            {
                                kind: 'generic',
                                type: 'pending',
                                controlId: 'control1',
                                isActive: true,
                                changeType: 'property',
                                fileName: 'testFile1',
                                title: 'Button',
                                properties: [
                                    {
                                        label: 'Text',
                                        value: '{i18n>DELETE}'
                                    }
                                ]
                            },
                            {
                                kind: 'control',
                                type: 'pending',
                                controlId: 'control12',
                                isActive: true,
                                changeType: 'property',
                                fileName: 'testFile1',
                                title: 'Button'
                            }
                        ],
                        saved: [
                            {
                                controlId: 'control1',
                                title: 'Button',
                                type: 'saved',
                                kind: 'generic',
                                fileName: 'file',
                                timestamp: 123,
                                changeType: 'property',
                                properties: [
                                    {
                                        label: 'Text',
                                        value: 'abc'
                                    }
                                ]
                            },
                            {
                                kind: 'control',
                                type: 'saved',
                                controlId: 'control23',
                                changeType: 'property',
                                fileName: 'testFile1',
                                title: 'Button',
                                timestamp: 123
                            }
                        ]
                    })
                )
            ).toStrictEqual({
                changes: {
                    controls: {
                        control1: {
                            pending: 1,
                            saved: 1,
                            controlName: undefined,
                            properties: {
                                Text: {
                                    lastChange: {
                                        kind: 'generic',
                                        title: 'Button',
                                        properties: [
                                            {
                                                label: 'Text',
                                                value: '{i18n>DELETE}'
                                            }
                                        ],
                                        changeType: 'property',
                                        controlId: 'control1',
                                        fileName: 'testFile1',
                                        isActive: true,
                                        type: 'pending'
                                    },
                                    lastSavedChange: {
                                        changeType: 'property',
                                        controlId: 'control1',
                                        kind: 'generic',
                                        properties: [
                                            {
                                                label: 'Text',
                                                value: 'abc'
                                            }
                                        ],
                                        fileName: 'file',
                                        timestamp: 123,
                                        type: 'saved',
                                        title: 'Button'
                                    },
                                    pending: 1,
                                    saved: 1
                                }
                            }
                        },
                        control12: {
                            controlName: undefined,
                            pending: 1,
                            properties: {},
                            saved: 0
                        },
                        control23: {
                            controlName: undefined,
                            pending: 0,
                            properties: {},
                            saved: 1
                        }
                    },
                    pending: [
                        {
                            changeType: 'property',
                            kind: 'generic',
                            type: 'pending',
                            controlId: 'control1',
                            fileName: 'testFile1',
                            isActive: true,
                            properties: [
                                {
                                    label: 'Text',
                                    value: '{i18n>DELETE}'
                                }
                            ],
                            title: 'Button'
                        },
                        {
                            changeType: 'property',
                            controlId: 'control12',
                            fileName: 'testFile1',
                            isActive: true,
                            kind: 'control',
                            title: 'Button',
                            type: 'pending'
                        }
                    ],
                    saved: [
                        {
                            changeType: 'property',
                            controlId: 'control1',
                            type: 'saved',
                            kind: 'generic',
                            fileName: 'file',
                            timestamp: 123,
                            properties: [
                                {
                                    label: 'Text',
                                    value: 'abc'
                                }
                            ],
                            title: 'Button'
                        },
                        {
                            changeType: 'property',
                            controlId: 'control23',
                            fileName: 'testFile1',
                            kind: 'control',
                            timestamp: 123,
                            title: 'Button',
                            type: 'saved'
                        }
                    ]
                }
            });
        });

        test('changeStackModified - configuration', () => {
            expect(
                reducer(
                    {
                        changes: {
                            saved: [],
                            pending: [],
                            controls: [] // make sure that old value is not reused
                        }
                    } as any,
                    changeStackModified({
                        pending: [
                            {
                                kind: 'generic',
                                type: 'pending',
                                controlId: ['control1', 'control5'],
                                isActive: true,
                                fileName: 'testFile1',
                                changeType: 'configuration',
                                title: 'Test Title',
                                properties: [
                                    {
                                        label: 'configProperty1',
                                        value: '{i18n>DELETE}',
                                        displayValueWithIcon: true
                                    }
                                ]
                            }
                        ],
                        saved: [
                            {
                                controlId: ['control2', 'control4'],
                                type: 'saved',
                                kind: 'generic',
                                fileName: 'file',
                                timestamp: 123,
                                subtitle: 'controlConfig/@sap.com.ui.v1.LineItem/tableSettiings',
                                changeType: 'configuration',
                                properties: [
                                    {
                                        label: 'configProperty2',
                                        value: 'abc',
                                        displayValueWithIcon: true
                                    }
                                ],
                                title: 'Config Change'
                            }
                        ]
                    })
                )
            ).toStrictEqual({
                changes: {
                    controls: {
                        control1: {
                            controlName: undefined,
                            pending: 1,
                            properties: {
                                configProperty1: {
                                    lastChange: {
                                        title: 'Test Title',
                                        controlId: ['control1', 'control5'],
                                        fileName: 'testFile1',
                                        isActive: true,
                                        changeType: 'configuration',
                                        kind: 'generic',
                                        type: 'pending',
                                        properties: [
                                            {
                                                label: 'configProperty1',
                                                value: '{i18n>DELETE}',
                                                displayValueWithIcon: true
                                            }
                                        ]
                                    },
                                    pending: 1,
                                    saved: 0
                                }
                            },
                            saved: 0
                        },
                        control2: {
                            controlName: undefined,
                            pending: 0,
                            properties: {
                                configProperty2: {
                                    lastSavedChange: {
                                        controlId: ['control2', 'control4'],
                                        changeType: 'configuration',
                                        fileName: 'file',
                                        kind: 'generic',
                                        subtitle: 'controlConfig/@sap.com.ui.v1.LineItem/tableSettiings',
                                        timestamp: 123,
                                        type: 'saved',
                                        title: 'Config Change',
                                        properties: [
                                            {
                                                label: 'configProperty2',
                                                value: 'abc',
                                                displayValueWithIcon: true
                                            }
                                        ]
                                    },
                                    pending: 0,
                                    saved: 1
                                }
                            },
                            saved: 1
                        },
                        control4: {
                            controlName: undefined,
                            pending: 0,
                            properties: {
                                configProperty2: {
                                    lastSavedChange: {
                                        controlId: ['control2', 'control4'],
                                        kind: 'generic',
                                        title: 'Config Change',
                                        fileName: 'file',
                                        changeType: 'configuration',
                                        subtitle: 'controlConfig/@sap.com.ui.v1.LineItem/tableSettiings',
                                        timestamp: 123,
                                        type: 'saved',
                                        properties: [
                                            {
                                                label: 'configProperty2',
                                                value: 'abc',
                                                displayValueWithIcon: true
                                            }
                                        ]
                                    },
                                    pending: 0,
                                    saved: 1
                                }
                            },
                            saved: 1
                        },
                        control5: {
                            controlName: undefined,
                            pending: 1,
                            properties: {
                                configProperty1: {
                                    lastChange: {
                                        kind: 'generic',
                                        title: 'Test Title',
                                        controlId: ['control1', 'control5'],
                                        fileName: 'testFile1',
                                        isActive: true,
                                        changeType: 'configuration',
                                        type: 'pending',
                                        properties: [
                                            {
                                                label: 'configProperty1',
                                                value: '{i18n>DELETE}',
                                                displayValueWithIcon: true
                                            }
                                        ]
                                    },
                                    pending: 1,
                                    saved: 0
                                }
                            },
                            saved: 0
                        }
                    },
                    pending: [
                        {
                            controlId: ['control1', 'control5'],
                            title: 'Test Title',
                            fileName: 'testFile1',
                            isActive: true,
                            kind: 'generic',
                            changeType: 'configuration',
                            type: 'pending',
                            properties: [
                                {
                                    label: 'configProperty1',
                                    value: '{i18n>DELETE}',
                                    displayValueWithIcon: true
                                }
                            ]
                        }
                    ],
                    saved: [
                        {
                            controlId: ['control2', 'control4'],
                            fileName: 'file',
                            title: 'Config Change',
                            kind: 'generic',
                            subtitle: 'controlConfig/@sap.com.ui.v1.LineItem/tableSettiings',
                            timestamp: 123,
                            type: 'saved',
                            changeType: 'configuration',
                            properties: [
                                {
                                    label: 'configProperty2',
                                    value: 'abc',
                                    displayValueWithIcon: true
                                }
                            ]
                        }
                    ]
                }
            });
        });
    });

    test('storageFileChanged', () => {
        expect(
            reducer(
                {
                    changes: {
                        saved: [],
                        pending: [],
                        controls: [], // make sure that old value is not reused
                        pendingChangeIds: ['testFile1']
                    }
                } as any,
                storageFileChanged('testFile2')
            )
        ).toStrictEqual({
            'changes': {
                'controls': [],
                'pending': [],
                'pendingChangeIds': ['testFile1', 'testFile2'],
                'saved': []
            }
        });
    });
    test('changeDeviceType', () => {
        expect(reducer({ deviceType: DeviceType.Desktop } as any, changeDeviceType(DeviceType.Desktop))).toStrictEqual({
            deviceType: DeviceType.Desktop
        });
    });
    describe('setApplicationRequiresReload', () => {
        test('one change requires reload', () => {
            expect(
                reducer({ applicationRequiresReload: false } as any, setApplicationRequiresReload(true))
            ).toStrictEqual({
                applicationRequiresReload: true
            });
        });
        test('no changes require reload', () => {
            expect(
                reducer({ applicationRequiresReload: true } as any, setApplicationRequiresReload(false))
            ).toStrictEqual({
                applicationRequiresReload: false
            });
        });
    });

    describe('filterNodes', () => {
        test('disable "focusEditable" and "focusCommonlyUsed"', () => {
            expect(
                reducer(
                    {
                        filterQuery: [
                            { name: FilterName.focusEditable, value: true },
                            { name: FilterName.focusCommonlyUsed, value: true },
                            { name: FilterName.query, value: '' }
                        ]
                    } as any,
                    filterNodes([
                        { name: FilterName.focusEditable, value: false },
                        { name: FilterName.focusCommonlyUsed, value: false }
                    ])
                )
            ).toStrictEqual({
                filterQuery: [
                    {
                        name: 'focus-editable-controls',
                        value: false
                    },
                    {
                        name: 'focus-commonly-used-controls',
                        value: false
                    },
                    {
                        name: 'query',
                        value: ''
                    }
                ]
            });
        });
    });

    describe('fileChanged', () => {
        test('UI change', () => {
            expect(
                reducer(
                    {
                        changes: {
                            saved: [],
                            pending: [],
                            controls: [], // make sure that old value is not reused
                            pendingChangeIds: ['testFile1']
                        }
                    } as any,
                    fileChanged(['testFile1'])
                )
            ).toStrictEqual({
                'changes': { 'controls': [], 'pending': [], 'pendingChangeIds': [], 'saved': [] },
                'fileChanges': []
            });
        });

        test('external changes (scenario 1)', () => {
            jest.spyOn(Date, 'now').mockReturnValue(1736392383604);
            expect(
                reducer(
                    {
                        changes: {
                            saved: [],
                            pending: [],
                            controls: [], // make sure that old value is not reused
                            pendingChangeIds: ['testFile1']
                        }
                    } as any,
                    fileChanged(['testFile2'])
                )
            ).toStrictEqual({
                'changes': { 'controls': [], 'pending': [], 'pendingChangeIds': ['testFile1'], 'saved': [] },
                'fileChanges': ['testFile2'],
                'lastExternalFileChangeTimestamp': 1736392383604
            });
        });

        test('external changes (scenario 2)', () => {
            jest.spyOn(Date, 'now').mockReturnValue(12333434312);
            expect(
                reducer(
                    {
                        fileChanges: ['testFile3'],
                        changes: {
                            saved: [],
                            pending: [],
                            controls: [], // make sure that old value is not reused
                            pendingChangeIds: ['testFile1']
                        }
                    } as any,
                    fileChanged(['testFile2'])
                )
            ).toStrictEqual({
                'changes': { 'controls': [], 'pending': [], 'pendingChangeIds': ['testFile1'], 'saved': [] },
                'fileChanges': ['testFile3', 'testFile2'],
                'lastExternalFileChangeTimestamp': 12333434312
            });
        });
    });

    describe('setProjectScenario', () => {
        test('AdaptationProject', () => {
            expect(
                reducer({ scenario: SCENARIO.UiAdaptation } as any, setProjectScenario(SCENARIO.AdaptationProject))
            ).toStrictEqual({ scenario: SCENARIO.AdaptationProject, isAdpProject: true });
        });
    });

    test('reloadApplication', () => {
        expect(
            reducer(
                {
                    fileChanges: ['testFile']
                } as any,
                reloadApplication({ save: false })
            )
        ).toStrictEqual({
            fileChanges: [],
            isAppLoading: true
        });
    });

    test('requestControlContextMenu.fulfilled', () => {
        expect(
            reducer(
                {
                    contextMenu: undefined
                } as any,
                requestControlContextMenu.fulfilled({
                    contextMenuItems: [
                        {
                            id: 'DEVACTION01',
                            enabled: true,
                            title: 'dev action 01',
                            tooltip: ''
                        },
                        {
                            id: 'DEVACTION02',
                            enabled: true,
                            title: 'dev action 02',
                            tooltip: ''
                        },
                        {
                            id: 'DEFAULTACTION01',
                            enabled: true,
                            title: 'default action 01',
                            tooltip: ''
                        },
                        {
                            id: 'DEFAULTACTION02',
                            enabled: true,
                            title: 'default action 02',
                            tooltip: ''
                        }
                    ],
                    controlId: 'test-control-01'
                })
            )
        ).toStrictEqual({
            contextMenu: {
                contextMenuItems: [
                    {
                        enabled: true,
                        id: 'DEVACTION01',
                        title: 'dev action 01',
                        tooltip: ''
                    },
                    {
                        enabled: true,
                        id: 'DEVACTION02',
                        title: 'dev action 02',
                        tooltip: ''
                    },
                    {
                        enabled: true,
                        id: 'DEFAULTACTION01',
                        title: 'default action 01',
                        tooltip: ''
                    },
                    {
                        enabled: true,
                        id: 'DEFAULTACTION02',
                        title: 'default action 02',
                        tooltip: ''
                    }
                ],
                controlId: 'test-control-01'
            }
        });
    });

    test('applicationModeChanged', () => {
        expect(
            reducer(
                {
                    appMode: 'adaptation'
                } as any,
                applicationModeChanged('navigation')
            )
        ).toStrictEqual({
            appMode: 'navigation'
        });
    });

    test('iconsLoaded', () => {
        expect(reducer({ icons: [] } as any, iconsLoaded([]))).toStrictEqual({ icons: [] });
    });

    test('quickActionListChanged', () => {
        expect(
            reducer(
                { quickActions: [] } as any,
                quickActionListChanged([
                    {
                        actions: [
                            {
                                id: 'test id 1',
                                enabled: true,
                                kind: 'simple',
                                title: 'test title'
                            }
                        ],
                        title: 'test title 1'
                    },
                    {
                        actions: [
                            {
                                id: 'test id 2',
                                enabled: true,
                                kind: 'nested',
                                children: [
                                    {
                                        path: '0',
                                        label: 'test label',
                                        enabled: true,
                                        children: [
                                            {
                                                path: '0/0',
                                                label: 'test label 2',
                                                enabled: true,
                                                children: []
                                            },
                                            {
                                                path: '0/1',
                                                label: 'test label 3',
                                                enabled: true,
                                                children: []
                                            }
                                        ]
                                    }
                                ],
                                title: 'test title'
                            }
                        ],
                        title: 'test title 1'
                    }
                ])
            )
        ).toStrictEqual({
            quickActions: [
                {
                    actions: [
                        {
                            id: 'test id 1',
                            enabled: true,
                            kind: 'simple',
                            title: 'test title'
                        }
                    ],
                    title: 'test title 1'
                },
                {
                    actions: [
                        {
                            id: 'test id 2',
                            enabled: true,
                            kind: 'nested',
                            children: [
                                {
                                    path: '0',
                                    enabled: true,
                                    label: 'test label',
                                    children: [
                                        {
                                            path: '0/0',
                                            enabled: true,
                                            label: 'test label 2',
                                            children: []
                                        },
                                        {
                                            path: '0/1',
                                            enabled: true,
                                            label: 'test label 3',
                                            children: []
                                        }
                                    ]
                                }
                            ],
                            title: 'test title'
                        }
                    ],
                    title: 'test title 1'
                }
            ]
        });
    });

    test('updateQuickAction', () => {
        expect(
            reducer(
                {
                    quickActions: [
                        {
                            actions: [
                                {
                                    id: 'test id 1',
                                    enabled: true,
                                    kind: 'simple',
                                    title: 'test title'
                                }
                            ],
                            title: 'test title 1'
                        },
                        {
                            actions: [
                                {
                                    id: 'test id 2',
                                    enabled: true,
                                    kind: 'nested',
                                    children: [
                                        {
                                            label: 'test label',
                                            children: [
                                                {
                                                    label: 'test label 2',
                                                    children: []
                                                },
                                                {
                                                    label: 'test label 3',
                                                    children: []
                                                }
                                            ]
                                        }
                                    ],
                                    title: 'test title 22'
                                }
                            ],
                            title: 'test title 2'
                        }
                    ]
                } as any,
                updateQuickAction({ id: 'test id 1', enabled: false, kind: 'simple', title: 'new test' })
            )
        ).toStrictEqual({
            quickActions: [
                {
                    actions: [
                        {
                            id: 'test id 1',
                            enabled: false,
                            kind: 'simple',
                            title: 'new test'
                        }
                    ],
                    title: 'test title 1'
                },
                {
                    actions: [
                        {
                            id: 'test id 2',
                            enabled: true,
                            kind: 'nested',
                            children: [
                                {
                                    label: 'test label',
                                    children: [
                                        {
                                            label: 'test label 2',
                                            children: []
                                        },
                                        {
                                            label: 'test label 3',
                                            children: []
                                        }
                                    ]
                                }
                            ],
                            title: 'test title 22'
                        }
                    ],
                    title: 'test title 2'
                }
            ]
        });
    });

    describe('setFeatureToggles', () => {
        test('add feature toggles', () => {
            expect(
                reducer(
                    { features: {} } as any,
                    setFeatureToggles([
                        {
                            feature: 'test.feature',
                            isEnabled: true
                        }
                    ])
                )
            ).toStrictEqual({
                features: {
                    'test.feature': true
                }
            });
        });
    });

    describe('toggleAppPreviewVisibility ', () => {
        test('show application preview', () => {
            testToggleApplicationPreview(true);
        });

        test('hide application preview', () => {
            testToggleApplicationPreview(false);
        });

        function testToggleApplicationPreview(isAppPreviewVisible: boolean): void {
            expect(reducer({} as any, toggleAppPreviewVisibility(isAppPreviewVisible))).toStrictEqual({
                isAppPreviewVisible
            });
        }
    });
});
