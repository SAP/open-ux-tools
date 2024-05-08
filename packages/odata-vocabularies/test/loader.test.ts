import { loadVocabulariesInformation } from './../src/loader';
import type { Term } from '../src/types/vocabulary-service';
import { ENTITY_TYPE_KIND } from '@sap-ux/odata-annotation-core-types';

declare const expect: jest.Expect;

const vocabularyInformation = loadVocabulariesInformation();
const namespace = 'com.sap.vocabularies.UI.v1';
const term = 'com.sap.vocabularies.UI.v1.LineItem';
const target = ENTITY_TYPE_KIND;

describe('lib vocabulary loader', () => {
    it('correct term definition in dictionary', () => {
        // Expect
        expect(vocabularyInformation.dictionary.get(term)).toMatchInlineSnapshot(`
            Object {
              "appliesTo": Array [
                "EntityType",
              ],
              "description": "Collection of data fields for representation in a table or list",
              "isCollection": true,
              "kind": "Term",
              "name": "com.sap.vocabularies.UI.v1.LineItem",
              "type": "com.sap.vocabularies.UI.v1.DataFieldAbstract",
            }
        `);
    });
    it('term listed as available for kind (based on AppliesTo) ', () => {
        // Act
        const specificTargetKind = vocabularyInformation.byTarget.get(target);
        // Expect
        expect(specificTargetKind?.has(term)).toBeTruthy();
    });
    it('namespace listed with alias ', () => {
        // Expect
        expect(vocabularyInformation.supportedVocabularies.get(namespace)).toMatchInlineSnapshot(`
            Object {
              "defaultAlias": "UI",
              "defaultUri": "https://sap.github.io/odata-vocabularies/vocabularies/UI.xml",
              "namespace": "com.sap.vocabularies.UI.v1",
            }
        `);
    });
    it('check derived types for terms type ', () => {
        // Arrange
        const termObject = vocabularyInformation.dictionary.get(term) as Term;
        // Expect
        expect(vocabularyInformation.derivedTypesPerType.get(termObject.type)).toMatchInlineSnapshot(`
            Map {
              "com.sap.vocabularies.UI.v1.DataFieldForAnnotation" => false,
              "com.sap.vocabularies.UI.v1.DataFieldForActionAbstract" => true,
              "com.sap.vocabularies.UI.v1.DataFieldForActionGroup" => false,
              "com.sap.vocabularies.UI.v1.DataField" => false,
            }
        `);
    });
    it('check upper case name is present', () => {
        expect(vocabularyInformation.upperCaseNameMap.get(term.toUpperCase())).toBe(term);
    });

    it('check upper case name considers baseType', () => {
        const term = 'com.sap.vocabularies.UI.v1.ReferenceFacet';
        const result = vocabularyInformation.upperCaseNameMap.get(term.toUpperCase()) as Map<string, string>;
        const id = result.get('ID');
        const label = result.get('LABEL');
        expect(id).toStrictEqual('ID');
        expect(label).toStrictEqual('Label');
    });
    it('JSON vocabulary term listed as available for kind (based on AppliesTo) ', () => {
        // Act
        const specificTargetKind = vocabularyInformation.byTarget.get(target);
        // Expect
        expect(specificTargetKind?.has('Org.OData.JSON.V1.Schema')).toBeTruthy();
    });
    it('JSON vocabulary namespace listed with correct alias', () => {
        // Expect
        expect(vocabularyInformation.supportedVocabularies.get('Org.OData.JSON.V1')).toMatchSnapshot();
    });
});
