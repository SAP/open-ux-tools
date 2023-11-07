import { loadVocabulariesInformation } from '../src/loader';
import { PROPERTY_KIND } from '../src/types/base-types';

declare const expect: jest.Expect;

const vocabularyInformation = loadVocabulariesInformation(true);
const namespace = 'com.sap.vocabularies.CDS.v1';
const term = 'com.sap.vocabularies.CDS.v1.AssertNotNull';
const target = PROPERTY_KIND;

describe('lib vocabulary loader (CDS)', () => {
    it('correct term definition in dictionary', () => {
        // Expect
        expect(vocabularyInformation.dictionary.get(term)).toMatchSnapshot();
    });
    it('term listed as available for kind (based on AppliesTo) ', () => {
        // Act
        const specificTargetKind = vocabularyInformation.byTarget.get(target);
        // Expect
        expect(specificTargetKind?.has(term)).toBeTruthy();
    });
    it('namespace listed with alias ', () => {
        // Expect
        expect(vocabularyInformation.supportedVocabularies.get(namespace)).toMatchSnapshot();
    });
});
