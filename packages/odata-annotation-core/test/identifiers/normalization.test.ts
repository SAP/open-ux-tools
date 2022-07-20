import { toFullyQualifiedName } from '../../src/names/normalization';

describe('identifiers', () => {
    describe('toFullyQualifiedName', () => {
        test('without namespace or alias', () => {
            expect(
                toFullyQualifiedName({}, 'com.sap.vocabularies.UI.v1', {
                    type: 'identifier',
                    name: 'LineItem'
                })
            ).toStrictEqual('com.sap.vocabularies.UI.v1.LineItem');
        });

        test('collection without namespace or alias', () => {
            expect(
                toFullyQualifiedName({}, 'com.sap.vocabularies.UI.v1', {
                    type: 'collection',
                    name: 'LineItem'
                })
            ).toStrictEqual('Collection(com.sap.vocabularies.UI.v1.LineItem)');
        });

        test('with alias', () => {
            expect(
                toFullyQualifiedName(
                    {
                        UI: 'com.sap.vocabularies.UI.v1',
                        'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1'
                    },
                    'Namespace1',
                    {
                        type: 'identifier',
                        name: 'LineItem',
                        namespaceOrAlias: 'UI'
                    }
                )
            ).toStrictEqual('com.sap.vocabularies.UI.v1.LineItem');
        });

        test('with namespace', () => {
            expect(
                toFullyQualifiedName(
                    {
                        UI: 'com.sap.vocabularies.UI.v1',
                        'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1'
                    },
                    'Namespace1',
                    {
                        type: 'identifier',
                        name: 'LineItem',
                        namespaceOrAlias: 'com.sap.vocabularies.UI.v1'
                    }
                )
            ).toStrictEqual('com.sap.vocabularies.UI.v1.LineItem');
        });

        test('alias is not in the lookup', () => {
            expect(
                toFullyQualifiedName({}, 'Namespace1', {
                    type: 'identifier',
                    name: 'LineItem',
                    namespaceOrAlias: 'UI'
                })
            ).toStrictEqual(undefined);
        });

        test('function', () => {
            expect(
                toFullyQualifiedName({}, 'MySchema', {
                    type: 'action-function',
                    name: 'MyAction',
                    parameters: [
                        {
                            type: 'identifier',
                            name: 'MyBindingType'
                        }
                    ]
                })
            ).toStrictEqual('MySchema.MyAction(MySchema.MyBindingType)');
        });
    });
});
