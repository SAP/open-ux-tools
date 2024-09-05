import { SAPAnnotationConverter } from '../../../src/sap/converter';
import { createValue } from '../../../src/sap/builders';
import { logger } from '../../../src/logger';

describe('SAP Annotation Converter', () => {
    const converter = new SAPAnnotationConverter();

    beforeEach(() => {
        jest.clearAllMocks();
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
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
            expect(logger.warn).toHaveBeenCalledWith(
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
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
            expect(logger.warn).toHaveBeenCalledTimes(0);
            expect(result).toMatchSnapshot();
        });
    });
});
