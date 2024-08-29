import {
    changeStackModified,
    iconsLoaded,
    propertyChanged,
    propertyChangeFailed,
    quickActionListChanged,
    reloadApplication,
    SCENARIO,
    showMessage,
    storageFileChanged,
    updateQuickAction
} from '@sap-ux-private/control-property-editor-common';

import reducer, {
    FilterName,
    filterNodes,
    changeProperty,
    changeDeviceType,
    setProjectScenario,
    fileChanged
} from '../../src/slice';
import { DeviceType } from '../../src/devices';

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

        test('filterNodes', () => {
            expect(
                reducer(
                    {
                        filterQuery: [
                            { name: FilterName.focusEditable, value: false },
                            { name: FilterName.focusCommonlyUsed, value: false },
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

        test('changeDeviceType', () => {
            expect(
                reducer({ deviceType: DeviceType.Desktop } as any, changeDeviceType(DeviceType.Desktop))
            ).toStrictEqual({
                deviceType: DeviceType.Desktop
            });
        });

        test('iconsLoaded', () => {
            expect(reducer({ icons: [] } as any, iconsLoaded([]))).toStrictEqual({ icons: [] });
        });

        test('setProjectScenario', () => {
            expect(
                reducer({ scenario: SCENARIO.UiAdaptation } as any, setProjectScenario(SCENARIO.AdaptationProject))
            ).toStrictEqual({ scenario: SCENARIO.AdaptationProject, isAdpProject: true });
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
                                type: 'pending',
                                controlName: 'Button',
                                controlId: 'control1',
                                isActive: true,
                                propertyName: 'text',
                                value: '{i18n>DELETE}',
                                changeType: 'propertyChange',
                                fileName: 'testFile1'
                            }
                        ],
                        saved: [
                            {
                                controlId: 'control1',
                                controlName: 'Button',
                                propertyName: 'text',
                                type: 'saved',
                                kind: 'valid',
                                fileName: 'file',
                                timestamp: 123,
                                value: 'abc',
                                changeType: 'propertyChange'
                            }
                        ]
                    })
                )
            ).toStrictEqual({
                changes: {
                    controls: {
                        control1: {
                            controlName: 'Button',
                            pending: 1,
                            saved: 1,
                            properties: {
                                text: {
                                    lastChange: {
                                        changeType: 'propertyChange',
                                        controlName: 'Button',
                                        controlId: 'control1',
                                        fileName: 'testFile1',
                                        isActive: true,
                                        propertyName: 'text',
                                        type: 'pending',
                                        value: '{i18n>DELETE}'
                                    },
                                    lastSavedChange: {
                                        changeType: 'propertyChange',
                                        controlId: 'control1',
                                        controlName: 'Button',
                                        kind: 'valid',
                                        fileName: 'file',
                                        propertyName: 'text',
                                        timestamp: 123,
                                        type: 'saved',
                                        value: 'abc'
                                    },
                                    pending: 1,
                                    saved: 1
                                }
                            }
                        }
                    },
                    pending: [
                        {
                            changeType: 'propertyChange',
                            type: 'pending',
                            controlName: 'Button',
                            controlId: 'control1',
                            fileName: 'testFile1',
                            isActive: true,
                            propertyName: 'text',
                            value: '{i18n>DELETE}'
                        }
                    ],
                    saved: [
                        {
                            changeType: 'propertyChange',
                            controlId: 'control1',
                            controlName: 'Button',
                            propertyName: 'text',
                            type: 'saved',
                            kind: 'valid',
                            fileName: 'file',
                            timestamp: 123,
                            value: 'abc'
                        }
                    ]
                }
            });
        });

        test('fileChanged (UI change)', () => {
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

        test('fileChanged (external changes (scenario 1))', () => {
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
                'fileChanges': ['testFile2']
            });
        });

        test('fileChanged (external changes (scenario 2))', () => {
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
                'fileChanges': ['testFile3', 'testFile2']
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

        test('show message', () => {
            expect(reducer({} as any, showMessage({ message: 'testMessage', shouldHideIframe: false }))).toStrictEqual({
                dialogMessage: { message: 'testMessage', shouldHideIframe: false }
            });
        });
        test('reload application', () => {
            expect(
                reducer(
                    {
                        fileChanges: ['testFile']
                    } as any,
                    reloadApplication()
                )
            ).toStrictEqual({
                fileChanges: [],
                isAppLoading: true
            });
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
    });
});
