import { parsePath } from '../../src/paths/parse';

describe('paths', () => {
    describe('parser', () => {
        test('property', () => {
            expect(parsePath('MySchema.MyEntityType/MyProperty')).toStrictEqual({
                segments: [
                    {
                        type: 'identifier',
                        name: 'MyEntityType',
                        namespaceOrAlias: 'MySchema'
                    },
                    {
                        type: 'identifier',
                        name: 'MyProperty'
                    }
                ]
            });
        });
        test('action', () => {
            expect(parsePath('MySchema.MyAction(MySchema.MyBindingType)')).toStrictEqual({
                segments: [
                    {
                        type: 'action-function',
                        namespaceOrAlias: 'MySchema',
                        name: 'MyAction',
                        parameters: [
                            {
                                type: 'identifier',
                                name: 'MyBindingType',
                                namespaceOrAlias: 'MySchema'
                            }
                        ]
                    }
                ]
            });
        });
        test('navigation property annotation', () => {
            expect(parsePath('MySchema.MyEntityType/MyNavigationProperty@Common.Label')).toStrictEqual({
                segments: [
                    {
                        type: 'identifier',
                        name: 'MyEntityType',
                        namespaceOrAlias: 'MySchema'
                    },
                    {
                        type: 'navigation-property-annotation',
                        name: 'MyNavigationProperty',
                        term: {
                            type: 'term-cast',
                            namespaceOrAlias: 'Common',
                            name: 'Label',
                            qualifier: undefined
                        }
                    }
                ]
            });
        });
        test('term cast', () => {
            expect(parsePath('MySchema.MyEntityType/MyNavigationProperty/@Common.Label')).toStrictEqual({
                segments: [
                    {
                        type: 'identifier',
                        name: 'MyEntityType',
                        namespaceOrAlias: 'MySchema'
                    },
                    {
                        type: 'identifier',
                        name: 'MyNavigationProperty'
                    },
                    {
                        type: 'term-cast',
                        namespaceOrAlias: 'Common',
                        name: 'Label',
                        qualifier: undefined
                    }
                ]
            });
        });
        test('term cast with qualifier', () => {
            expect(parsePath('MySchema.MyEntityType/MyNavigationProperty/@Common.Label#Q')).toStrictEqual({
                segments: [
                    {
                        type: 'identifier',
                        name: 'MyEntityType',
                        namespaceOrAlias: 'MySchema'
                    },
                    {
                        type: 'identifier',
                        name: 'MyNavigationProperty'
                    },
                    {
                        type: 'term-cast',
                        namespaceOrAlias: 'Common',
                        name: 'Label',
                        qualifier: 'Q'
                    }
                ]
            });
        });
    });
});
