import {
    changeStackModified,
    iconsLoaded,
    propertyChanged,
    propertyChangeFailed,
    scenario,
    scenarioLoaded
} from '@sap-ux-private/control-property-editor-common';

import reducer, { FilterName, filterNodes, changeProperty, changeDeviceType } from '../../src/slice';
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
                        value: 'change text'
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

        test('scenarioLoaded', () => {
            expect(
                reducer({ scenario: scenario.AdaptationProject } as any, scenarioLoaded(scenario.AdaptationProject))
            ).toStrictEqual({ scenario: scenario.AdaptationProject });
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
                                value: '{i18n>DELETE}'
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
                                value: 'abc'
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
                                        controlName: 'Button',
                                        controlId: 'control1',
                                        isActive: true,
                                        propertyName: 'text',
                                        type: 'pending',
                                        value: '{i18n>DELETE}'
                                    },
                                    lastSavedChange: {
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
                            type: 'pending',
                            controlName: 'Button',
                            controlId: 'control1',
                            isActive: true,
                            propertyName: 'text',
                            value: '{i18n>DELETE}'
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
                            value: 'abc'
                        }
                    ]
                }
            });
        });
    });
});
