import { jest } from '@jest/globals';
import { createValue } from '../../../src/sap/builders';

const mockWarn = jest.fn();
const mockLog = jest.fn();
jest.unstable_mockModule('../../../src/logger', () => ({
    logger: {
        log: mockLog,
        warn: mockWarn
    }
}));

const { SAPAnnotationConverter } = await import('../../../src/sap/converter');

describe('SAP Annotation Converter', () => {
    const converter = new SAPAnnotationConverter();

    beforeEach(() => {
        mockWarn.mockReset();
        mockLog.mockReset();
    });

    describe('UI LineItem', () => {
        test('empty', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.LineItem',
                    items: []
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
        test('with a data field', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.LineItem',
                    items: [
                        {
                            type: 'UI.DataField',
                            value: createValue('name')
                        }
                    ]
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
        test('multiple items with label', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.LineItem',
                    items: [
                        {
                            type: 'UI.DataField',
                            value: createValue('name')
                        },
                        {
                            type: 'UI.DataField',
                            value: createValue('category'),
                            label: createValue('Category')
                        }
                    ]
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
    });

    describe('UI FieldGroup', () => {
        test('empty', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.FieldGroup',
                    data: []
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
        test('with multiple data fields', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.FieldGroup',
                    data: [
                        {
                            type: 'UI.DataField',
                            value: createValue('name')
                        },
                        {
                            type: 'UI.DataField',
                            value: createValue('category')
                        }
                    ]
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
    });

    describe('UI Facets', () => {
        test('no field group', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.Facets',
                    facets: []
                }
            ]);
            expect(mockWarn).toHaveBeenCalledWith(
                'Could not find a property to which attach Facets annotation for entity "Service.Entity"'
            );
            expect(result).toMatchSnapshot();
        });

        test('empty', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    qualifier: createValue('general'),
                    term: 'UI.FieldGroup',
                    data: [
                        {
                            type: 'UI.DataField',
                            value: createValue('name')
                        }
                    ]
                },
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.Facets',
                    facets: []
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });

        test('reference facet to field group', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    qualifier: createValue('general'),
                    term: 'UI.FieldGroup',
                    data: [
                        {
                            type: 'UI.DataField',
                            value: createValue('name')
                        }
                    ]
                },
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.Facets',
                    facets: [
                        {
                            type: 'UI.ReferenceFacet',
                            id: createValue('FacetID'),
                            target: createValue('general')
                        },
                        {
                            type: 'UI.ReferenceFacet',
                            id: createValue('FacetID2'),
                            target: createValue('general2'),
                            label: createValue('General 2')
                        }
                    ]
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
    });

    describe('combinations', () => {
        test('multiple labels for the same property', () => {
            const result = converter.convertAnnotations([
                {
                    target: createValue('Service.Entity'),
                    term: 'UI.LineItem',
                    items: [
                        {
                            type: 'UI.DataField',
                            value: createValue('category'),
                            label: createValue('Category From LineItem')
                        }
                    ]
                },
                {
                    target: createValue('Service.Entity'),
                    qualifier: createValue('general'),
                    term: 'UI.FieldGroup',
                    data: [
                        {
                            type: 'UI.DataField',
                            value: createValue('category'),
                            label: createValue('Category From FieldGroup')
                        }
                    ]
                }
            ]);
            expect(mockWarn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
    });
});
