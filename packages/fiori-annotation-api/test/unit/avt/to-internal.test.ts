import type { Expression, StringExpression } from '@sap-ux/vocabularies-types';
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
        test('Collection with string values', () => {
            testConversion({ type: 'Collection', Collection: ['test'] as unknown as StringExpression[] });
        });
        test('Record', () => {
            testConversion({
                type: 'Record',
                Record: { propertyValues: [], type: 'com.sap.vocabularies.UI.v1.DataField' }
            });
        });
        // Currently not supported
        test('If', () => {
            testConversion({ type: 'If', $If: [{ type: 'Null' }, { type: 'Null' }, { type: 'Null' }] });
        });
        // Currently not supported
        test('Apply', () => {
            testConversion({
                type: 'Apply',
                $Apply: [
                    '#Supplier-displayFactSheet?Supplier={SUP}',
                    {
                        type: 'LabeledElement',
                        $Name: 'RSP',
                        $LabeledElement: {
                            type: 'Path',
                            $Path: 'SupplierEvalResponse'
                        }
                    }
                ],
                $Function: 'odata.fillUriTemplate'
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
