import { VocabularyService } from '../src/vocabulary-service';
declare const expect: jest.Expect;

const vocabularyService = new VocabularyService(true, true);
const namespaceCdsVocabulary = 'com.sap.vocabularies.CDS.v1';
const namespaceObjectModelVocabulary = 'com.sap.cds.vocabularies.ObjectModel';

describe('getVocabulary(CDS with analytics)', () => {
    it('getVocabularies(CDS) contains CDS', () => {
        const vocabularies = vocabularyService.getVocabularies();
        // Expect
        expect(vocabularies.get(namespaceCdsVocabulary)).toMatchSnapshot();
    });

    it('getVocabulary(ObjectModel) should return vocabulary', () => {
        // Expect
        expect(vocabularyService.getVocabulary(namespaceObjectModelVocabulary)).toMatchSnapshot();
    });
});
