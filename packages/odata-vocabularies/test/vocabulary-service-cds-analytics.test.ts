import { VocabularyService } from '../src/vocabulary-service';
declare const expect: jest.Expect;

const namespaceCdsVocabulary = 'com.sap.vocabularies.CDS.v1';
const namespaceObjectModelVocabulary = 'com.sap.cds.vocabularies.ObjectModel';

describe('getVocabulary(CDS with analytics)', () => {
    const vocabularyService = new VocabularyService(true, true);
    it('getVocabularies(CDS) contains CDS', () => {
        const vocabularies = vocabularyService.getVocabularies();
        // Expect
        expect(vocabularies.get(namespaceCdsVocabulary)).toMatchSnapshot();
    });

    it('getVocabulary(ObjectModel) should return vocabulary', () => {
        // Expect
        expect(vocabularyService.getVocabulary(namespaceObjectModelVocabulary)).toMatchSnapshot();
    });
    it('Instantiation with wrong parameterization', () => {
        let error: Error | undefined;
        try {
            new VocabularyService(false, true);
        } catch (e) {
            error = e;
        }
        // Expect
        expect(error?.message).toMatchInlineSnapshot(
            `"Vocabulary service instantiation: invalid parameterization includeCds=false and includeCdsAnalytics=true"`
        );
    });
});
