import { parseIdentifier } from '../../src/names/parse';

describe('identifiers', () => {
    describe('parser', () => {
        test('without namespace or alias', () => {
            expect(parseIdentifier('LineItem')).toStrictEqual({
                type: 'identifier',
                name: 'LineItem'
            });
        });

        test('with alias', () => {
            expect(parseIdentifier('UI.LineItem')).toStrictEqual({
                type: 'identifier',
                namespaceOrAlias: 'UI',
                name: 'LineItem'
            });
        });

        test('with namespace', () => {
            expect(parseIdentifier('com.sap.vocabularies.UI.v1.LineItem')).toStrictEqual({
                type: 'identifier',
                namespaceOrAlias: 'com.sap.vocabularies.UI.v1',
                name: 'LineItem'
            });
        });

        test('collection with namespace', () => {
            expect(parseIdentifier('Collection(com.sap.vocabularies.UI.v1.DataField)')).toStrictEqual({
                type: 'collection',
                namespaceOrAlias: 'com.sap.vocabularies.UI.v1',
                name: 'DataField'
            });
        });

        test('collection with missing )', () => {
            expect(parseIdentifier('Collection(com.sap.vocabularies.UI.v1.DataField')).toStrictEqual({
                type: 'collection',
                namespaceOrAlias: 'com.sap.vocabularies.UI.v1',
                name: 'DataField'
            });
        });

        test('action', () => {
            expect(parseIdentifier('MySchema.MyAction()')).toStrictEqual({
                type: 'action-function',
                namespaceOrAlias: 'MySchema',
                name: 'MyAction',
                parameters: []
            });
        });

        test('action with parameter', () => {
            expect(parseIdentifier('MySchema.MyAction(MySchema.MyBindingType)')).toStrictEqual({
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
            });
        });

        test('action with collection parameters', () => {
            expect(
                parseIdentifier('MySchema.MyAction(Collection(MySchema.MyBindingType),Collection(MySchema.MyType))')
            ).toStrictEqual({
                type: 'action-function',
                namespaceOrAlias: 'MySchema',
                name: 'MyAction',
                parameters: [
                    {
                        type: 'collection',
                        name: 'MyBindingType',
                        namespaceOrAlias: 'MySchema'
                    },
                    {
                        type: 'collection',
                        name: 'MyType',
                        namespaceOrAlias: 'MySchema'
                    }
                ]
            });
        });
    });
});
