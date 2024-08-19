import { toAliasQualifiedName, resolveName, toFullyQualifiedName } from '../../src';

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
describe('resolveName', () => {
    const aliasInfo = {
        currentFileNamespace: 'Namespace1',
        currentFileAlias: '',
        aliasMap: {
            'com.sap.vocabularies.Common.v1': 'com.sap.vocabularies.Common.v1',
            Common: 'com.sap.vocabularies.Common.v1',
            'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1',
            UI: 'com.sap.vocabularies.UI.v1',
            'com.sap.vocabularies.Communication.v1': 'com.sap.vocabularies.Communication.v1',
            Communication: 'com.sap.vocabularies.Communication.v1',
            SEPMRA_PROD_MAN: 'SEPMRA_PROD_MAN',
            SAP: 'SEPMRA_PROD_MAN',
            Namespace1: 'Namespace1'
        },
        reverseAliasMap: {
            'com.sap.vocabularies.Common.v1': 'Common',
            'com.sap.vocabularies.UI.v1': 'UI',
            'com.sap.vocabularies.Communication.v1': 'Communication',
            SEPMRA_PROD_MAN: 'SAP',
            Namespace1: 'Namespace1'
        },
        aliasMapMetadata: {
            SEPMRA_PROD_MAN: 'SEPMRA_PROD_MAN',
            SAP: 'SEPMRA_PROD_MAN'
        },
        aliasMapVocabulary: {
            'com.sap.vocabularies.Common.v1': 'com.sap.vocabularies.Common.v1',
            Common: 'com.sap.vocabularies.Common.v1',
            'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1',
            UI: 'com.sap.vocabularies.UI.v1',
            'com.sap.vocabularies.Communication.v1': 'com.sap.vocabularies.Communication.v1',
            Communication: 'com.sap.vocabularies.Communication.v1'
        }
    };
    test('Resolved Name with namespace', () => {
        // Arrange
        const qName = 'com.sap.vocabularies.UI.v1.LineItem';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name with namespace without aliasMap', () => {
        // Arrange
        const qName = 'com.sap.vocabularies.UI.v1.LineItem';

        // Act
        const result = resolveName(qName);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name with Alias', () => {
        // Arrange
        const qName = 'UI.LineItem';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name SAP.FunctionName(Collection(SAP.FunctionParam))', () => {
        // Arrange
        const qName = 'SAP.FunctionName(Collection(SAP.FunctionParam))';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name SAP.FunctionName(SAP.FunctionParam1,SAP.FunctionParam2)', () => {
        // Arrange
        const qName = 'SAP.FunctionName(SAP.FunctionParam1,SAP.FunctionParam2)';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name SAP.FunctionName(Collection(Edm.String))', () => {
        // Arrange
        const qName = 'SAP.FunctionName(Collection(Edm.String))';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name Collection(Edm.String) without aliasMapNamespace', () => {
        // Arrange
        const qName = 'Collection(Edm.String)';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    test('Resolved Name Collection(SAP.TestType) with aliasMapNamespace', () => {
        // Arrange
        const qName = 'Collection(SAP.TestType)';

        // Act
        const result = resolveName(qName, aliasInfo.aliasMap);

        // Expect
        expect(result).toMatchSnapshot();
    });

    describe('toAliasQualifiedName', () => {
        test('fullyQualifed vocabulary term', () => {
            // Arrange
            const termValue = 'com.sap.vocabularies.UI.v1.Chart()';

            // Act
            const result = toAliasQualifiedName(termValue, aliasInfo);

            // Expect
            expect(result).toEqual('UI.Chart()');
        });
        test('fullyQualifed metadata target', () => {
            // Arrange
            const termValue = 'SEPMRA_PROD_MAN.ProductType';

            // Act
            const result = toAliasQualifiedName(termValue, aliasInfo);

            // Expect
            expect(result).toEqual('SAP.ProductType');
        });
        test('qualfied vocabulary term', () => {
            // Arrange
            const termValue = 'UI.Chart';

            // Act
            const result = toAliasQualifiedName(termValue, aliasInfo);

            // Expect
            expect(result).toEqual('UI.Chart');
        });
    });
});
