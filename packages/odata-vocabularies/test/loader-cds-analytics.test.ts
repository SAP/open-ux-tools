import { loadVocabulariesInformation } from '../src/loader';
import { PROPERTY_KIND } from '@sap-ux/odata-annotation-core-types';

declare const expect: jest.Expect;

const vocabularyInformation = loadVocabulariesInformation(true, true);
const namespace = 'com.sap.cds.vocabularies.AnalyticsDetails';
const term = 'com.sap.cds.vocabularies.AnalyticsDetails.exceptionAggregationSteps';
const target = PROPERTY_KIND;

describe('lib vocabulary loader (CDS including analytics)', () => {
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
