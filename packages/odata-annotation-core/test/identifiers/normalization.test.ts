import { toFullyQualifiedName } from '../../src/names/normalization';

describe('identifiers', () => {
    describe('toFullyQualifiedName', () => {
        test('without namespace or alias', () => {
            expect(
                toFullyQualifiedName({}, 'com.sap.vocabularies.UI.v1', {
                    type: 'identifier',
                    name: 'LineItem',
                    raw: 'LineItem'
                })
            ).toStrictEqual('com.sap.vocabularies.UI.v1.LineItem');
        });

        test('collection without namespace or alias', () => {
            expect(
                toFullyQualifiedName({}, 'com.sap.vocabularies.UI.v1', {
                    type: 'collection',
                    name: 'LineItem',
                    raw: 'LineItem'
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
                        namespaceOrAlias: 'UI',
                        raw: 'UI.LineItem'
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
                        namespaceOrAlias: 'com.sap.vocabularies.UI.v1',
                        raw: 'com.sap.vocabularies.UI.v1.LineItem'
                    }
                )
            ).toStrictEqual('com.sap.vocabularies.UI.v1.LineItem');
        });

        test('alias is not in the lookup', () => {
            expect(
                toFullyQualifiedName({}, 'Namespace1', {
                    type: 'identifier',
                    name: 'LineItem',
                    namespaceOrAlias: 'UI',
                    raw: 'UI.LineItem'
                })
            ).toStrictEqual(undefined);
        });
    });
});
