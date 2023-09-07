/* eslint-disable @typescript-eslint/ban-ts-comment */
import type ElementOverlay from 'sap/ui/dt/ElementOverlay';
import type ManagedObject from 'sap/ui/base/ManagedObject';

import ControlUtils, { type MetadataOptionsProperty } from '../../src/adp/control-utils';

describe('client/control-utils', () => {
    describe('getControlAggregationByName', () => {
        const metadata = {
            getAllAggregations: jest.fn().mockReturnValue({}),
            getJSONKeys: jest.fn().mockReturnValue({})
        };
        const mockControl = {
            getMetadata: () => metadata,
            mockGetSomething: jest.fn().mockReturnValue({})
        };
        type controlType = ManagedObject & { __calledJSONKeys?: boolean; [key: string]: any };

        test('no control provided', () => {
            const result = ControlUtils.getControlAggregationByName(undefined as unknown as controlType, 'test');
            expect(result).toHaveLength(0);
        });

        test('has aggregations', () => {
            const name = '~name';
            metadata.getAllAggregations.mockReturnValueOnce({
                [name]: {
                    _sGetter: 'mockGetSomething'
                }
            });
            const result = ControlUtils.getControlAggregationByName(mockControl as unknown as controlType, name);
            expect(result).toHaveLength(1);
        });

        test('has no _sGetter', () => {
            const name = '~name';
            metadata.getAllAggregations.mockReturnValueOnce({
                [name]: {
                    _sGetter: undefined
                }
            });
            const result = ControlUtils.getControlAggregationByName(mockControl as unknown as controlType, name);
            expect(result).toHaveLength(0);
        });
    });

    describe('getRuntimeControl', () => {
        const runtimeControl = {
            sParentAggregationName: 'headerToolbar',
            sTag: 'Div',
            mAggregations: {},
            mAssociations: {},
            aCustomStyleClasses: {},
            getId: () => 'some-id'
        };

        test('should return runtime control if there is element instance', () => {
            const overlayControl = {
                sId: '__overlay00',
                getElementInstance: () => runtimeControl,
                getElement: () => runtimeControl
            };
            const control = ControlUtils.getRuntimeControl(overlayControl as unknown as ElementOverlay);

            expect(control.getId()).toBe('some-id');
        });

        test('should return runtime control', () => {
            const overlayControl = {
                sId: '__overlay00',
                getElement: () => runtimeControl
            };
            const control = ControlUtils.getRuntimeControl(overlayControl as unknown as ElementOverlay);

            expect(control.getId()).toBe('some-id');
        });
    });

    describe('checkPropertyValidity', () => {
        test('returns false when no property is passed', () => {
            // @ts-ignore
            const isValid = ControlUtils.checkPropertyValidity(undefined as unknown as MetadataOptionsProperty);
            expect(isValid).toBe(false);
        });

        test('returns false when cannot get propertyType', () => {
            const property = {
                getType: () => undefined
            };
            // @ts-ignore
            const isValid = ControlUtils.checkPropertyValidity(property as unknown as MetadataOptionsProperty);
            expect(isValid).toBe(false);
        });

        test('returns false when cannot get typeName', () => {
            const property = {
                getType: () => {
                    return {
                        getName: () => undefined
                    };
                }
            };

            // @ts-ignore
            const isValid = ControlUtils.checkPropertyValidity(property as unknown as MetadataOptionsProperty);
            expect(isValid).toBe(false);
        });

        test('returns true when all conditions pass', () => {
            const property = {
                getType: () => {
                    return {
                        getName: () => 'string'
                    };
                }
            };

            // @ts-ignore
            const isValid = ControlUtils.checkPropertyValidity(property as unknown as MetadataOptionsProperty);
            expect(isValid).toBe(true);
        });
    });

    describe('setAnalyzedTypeForEnumDataType', () => {
        test('should set correct values', () => {
            const propertyDataType = {
                getName: () => 'string'
            };
            const typeName = 'sap.ui.core.CSSSize';
            // @ts-ignore
            ControlUtils.analyzedType = {
                primitiveType: 'any',
                ui5Type: null,
                enumValues: null,
                isArray: false
            };
            // @ts-ignore
            ControlUtils.setAnalyzedTypeForEnumDataType(propertyDataType, typeName);
            // @ts-ignore
            const condition = ControlUtils.analyzedType.primitiveType === 'string';

            expect(condition).toBe(true);
        });
    });

    describe('analyzePropertyType', () => {
        test('sets analyzedType properties', () => {
            const typeNames = ['object', 'string', 'int', 'float', 'any'];
            for (const typeName of typeNames) {
                const property = {
                    getType: () => {
                        return {
                            getName: () => typeName
                        };
                    }
                };

                // @ts-ignore
                const analyzedType = ControlUtils.analyzePropertyType(property);

                expect(analyzedType?.primitiveType).toBe(typeName);
            }
        });

        test('sets analyzedType properties when typeName is string[]', () => {
            const property = {
                getType: () => {
                    return {
                        getName: () => 'string[]'
                    };
                }
            };

            // @ts-ignore
            const analyzedType = ControlUtils.analyzePropertyType(property);

            expect(analyzedType?.primitiveType).toBe('string');
            expect(analyzedType?.isArray).toBe(true);
        });

        test('returns empty analyzedType property is not valid', () => {
            const property = {
                getType: () => undefined
            };

            // @ts-ignore
            ControlUtils.analyzePropertyType(property);

            // @ts-ignore
            const condition = ControlUtils.analyzedType.ui5Type === null;
            expect(condition).toBe(true);
        });
    });

    describe('isPropertyEnabled', () => {
        test('returns true when analyzedType is array', () => {
            const analyzedType = {
                enumValues: null,
                isArray: true,
                primitiveType: 'any',
                ui5Type: null
            };
            // @ts-ignore
            const isEnabled = ControlUtils.isPropertyEnabled(analyzedType);

            expect(isEnabled).toBe(true);
        });

        test('returns true when analyzedType primitive type is any', () => {
            const analyzedType = {
                enumValues: null,
                isArray: false,
                primitiveType: 'any',
                ui5Type: null
            };
            // @ts-ignore
            const isEnabled = ControlUtils.isPropertyEnabled(analyzedType);

            expect(isEnabled).toBe(true);
        });
    });

    describe('normalizeObjectPropertyValue', () => {
        test('returns stringified object', () => {
            const rawValue = Object.create({ some: '' });
            rawValue.key = 'value';

            // @ts-ignore
            const result = ControlUtils.normalizeObjectPropertyValue(rawValue);

            expect(result).toBe('{"key":"value"}');
        });

        test('returns rawValue when it is of type array', () => {
            const rawValue = ['someValue'];

            // @ts-ignore
            const result = ControlUtils.normalizeObjectPropertyValue(rawValue);

            expect(result).toBe(rawValue);
        });

        test('returns empty string when it is of type function', () => {
            const rawValue = function () {
                return;
            };

            // @ts-ignore
            const result = ControlUtils.normalizeObjectPropertyValue(rawValue);

            expect(result).toBe('');
        });
    });

    describe('testIconPattern', () => {
        test('returns true if name starts with "src" ro with "icon"', () => {
            const names = ['src/someIcon.svg', 'icon://attachment-html', 'attachment-html//icon'];

            for (const name of names) {
                // @ts-ignore
                const result = ControlUtils.testIconPattern(name);

                expect(result).toBe(true);
            }
        });

        test('returns false if name is empty string', () => {
            // @ts-ignore
            const result = ControlUtils.testIconPattern('');

            expect(result).toBe(false);
        });
    });

    describe('convertCamelCaseToPascalCase', () => {
        test('should return uppercased string', () => {
            // @ts-ignore
            const result = ControlUtils.convertCamelCaseToPascalCase('blocked');
            expect(result).toBe('Blocked');
        });

        test('should return uppercased string split by space', () => {
            // @ts-ignore
            const result = ControlUtils.convertCamelCaseToPascalCase('busyIndicatorDelay');
            expect(result).toBe('Busy Indicator Delay');
        });
    });

    describe('buildControlData', () => {
        test('returns built runtime control data', async () => {
            const metadata = {
                getAllAggregations: jest.fn().mockReturnValue({}),
                getJSONKeys: jest.fn().mockReturnValue({}),
                getName: jest.fn().mockReturnValue('sap.m.OverflowToolbar'),
                getAllProperties: jest.fn().mockReturnValue({
                    active: { name: 'active' },
                    asyncMode: { name: 'asyncMode' },
                    blocked: { name: 'blocked' },
                    design: { name: 'design' },
                    style: { name: 'style' },
                    height: { name: 'height' },
                    width: { name: 'width' }
                })
            };
            const mockControl = {
                getMetadata: () => metadata,
                getId: () => 'sap.ui.demoapps.rta.fiorielements::TableToolbar',
                getProperty: () => false,
                getBindingInfo: () => undefined
            };

            ControlUtils.getRuntimeControl = jest.fn();
            // @ts-ignore
            ControlUtils.analyzePropertyType = jest
                .fn()
                .mockReturnValueOnce({
                    primitiveType: 'string',
                    ui5Type: null,
                    enumValues: null,
                    isArray: false
                })
                .mockReturnValueOnce({
                    primitiveType: 'int',
                    ui5Type: null,
                    enumValues: null,
                    isArray: false
                })
                .mockReturnValueOnce({
                    primitiveType: 'float',
                    ui5Type: null,
                    enumValues: null,
                    isArray: false
                })
                .mockReturnValueOnce({
                    primitiveType: 'enum',
                    ui5Type: null,
                    enumValues: null,
                    isArray: false
                })
                .mockReturnValueOnce({
                    primitiveType: 'boolean',
                    ui5Type: null,
                    enumValues: null,
                    isArray: false
                })
                .mockReturnValueOnce({
                    primitiveType: 'default-case',
                    ui5Type: null,
                    enumValues: null,
                    isArray: false
                })
                .mockReturnValueOnce(undefined);
            const data = await ControlUtils.buildControlData(mockControl as unknown as ManagedObject);

            expect(data.properties.length).toBe(5);
            expect(data.name).toBe('sap.m.OverflowToolbar');
        });
    });
});
