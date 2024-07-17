import type { Expression } from '@sap-ux/vocabularies-types';
import { createElementNode, type AliasInformation } from '@sap-ux/odata-annotation-core-types';

import { convertExpressionToInternal } from '../../../src/avt/to-internal';

describe('avt to internal', () => {
    const aliasInfo: AliasInformation = {
        aliasMap: { UI: 'com.sap.vocabularies.UI.v1', 'com.sap.vocabularies.UI.v1': 'com.sap.vocabularies.UI.v1' },
        aliasMapMetadata: {},
        aliasMapVocabulary: {},
        currentFileNamespace: '',
        reverseAliasMap: { 'com.sap.vocabularies.UI.v1': 'UI' }
    };

    describe('convertExpressionToInternal', () => {
        function testConversion(expression: Expression) {
            expect(convertExpressionToInternal(aliasInfo, expression)).toMatchSnapshot();
            expect(
                convertExpressionToInternal(aliasInfo, expression, createElementNode({ name: 'Annotation' }))
            ).toMatchSnapshot();
        }
        test('Collection', () => {
            testConversion({ type: 'Collection', Collection: [] });
        });
        test('Record', () => {
            testConversion({
                type: 'Record',
                Record: { propertyValues: [], type: 'com.sap.vocabularies.UI.v1.DataField' }
            });
        });
        test('If', () => {
            testConversion({ type: 'If', If: {} });
        });
        // Currently not supported
        test.skip('Apply', () => {
            testConversion({
                type: 'Apply',
                Apply: {
                    _attributes: {
                        Function: 'odata.fillUriTemplate'
                    },
                    String: {
                        _text: '#Supplier-displayFactSheet?Supplier={SUP}'
                    },
                    LabeledElement: {
                        _attributes: {
                            Name: 'RSP',
                            Path: 'SupplierEvalResponse'
                        }
                    }
                }
            });
        });
        test('Null', () => {
            testConversion({ type: 'Null' });
        });
        test('Unknown', () => {
            testConversion({ type: 'Unknown' });
        });
        test('Path', () => {
            testConversion({ type: 'Path', Path: 'test_path' });
        });
    });
});
