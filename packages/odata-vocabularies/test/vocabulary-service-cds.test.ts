import { VocabularyService } from '../src/vocabulary-service';
import type { Term } from '../src/types/vocabulary-service';
declare const expect: jest.Expect;

const vocabularyService = new VocabularyService(true);
const namespace = 'com.sap.vocabularies.CDS.v1';

it('getVocabularies(CDS) contains CDS', () => {
    const vocabularies = vocabularyService.getVocabularies();
    // Expect
    expect(vocabularies.get(namespace)).toMatchSnapshot();
});

describe('getVocabulary(CDS)', () => {
    it('CDS', () => {
        // Expect
        expect(vocabularyService.getVocabulary('CDS')).toMatchSnapshot();
    });

    it('getVocabulary(com.sap.vocabularies.CDS.v1)', () => {
        // Expect
        expect(vocabularyService.getVocabulary('com.sap.vocabularies.CDS.v1')).toMatchSnapshot();
    });

    it('cdsVocabulary information', () => {
        // Expect
        expect(vocabularyService.cdsVocabulary).toMatchSnapshot();
    });

    it('cds specific shortcut annotation term Common.TextArrangement', () => {
        const expectedTerm = {
            kind: 'Term',
            name: 'com.sap.vocabularies.Common.v1.TextArrangement',
            type: 'com.sap.vocabularies.UI.v1.TextArrangementType',
            isCollection: false,
            description: 'Describes the arrangement of a code or ID value and its text',
            longDescription: 'If used for a single property the Common.Text annotation is annotated',
            appliesTo: ['Property'],
            facets: { isNullable: true }
        };

        const term = vocabularyService.getTerm('com.sap.vocabularies.Common.v1.TextArrangement');

        // Expect
        expect(term).toEqual(expectedTerm);
    });

    it('cds specific shortcut annotation term Capabilities.Insertable', () => {
        const expectedTerm: Term = {
            kind: 'Term', // modified
            name: 'Org.OData.Capabilities.V1.Insertable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be inserted',
            defaultValue: true,
            appliesTo: ['EntitySet'] //added
        };

        const term = vocabularyService.getTerm('Org.OData.Capabilities.V1.Insertable');

        // Expect
        expect(term).toEqual(expectedTerm);
    });

    it('cds specific shortcut annotation term Capabilities.Deletable', () => {
        const expectedTerm: Term = {
            kind: 'Term', // modified
            name: 'Org.OData.Capabilities.V1.Deletable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be deleted',
            defaultValue: true,
            appliesTo: ['EntitySet'] //added
        };

        const term = vocabularyService.getTerm('Org.OData.Capabilities.V1.Deletable');

        // Expect
        expect(term).toEqual(expectedTerm);
    });

    it('cds specific shortcut annotation term Capabilities.Updatable', () => {
        const expectedTerm: Term = {
            kind: 'Term', // modified
            name: 'Org.OData.Capabilities.V1.Updatable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be updated',
            defaultValue: true,
            appliesTo: ['EntitySet'] //added
        };

        const term = vocabularyService.getTerm('Org.OData.Capabilities.V1.Updatable');

        // Expect
        expect(term).toEqual(expectedTerm);
    });

    it('cds specific shortcut annotation term Capabilities.Readable', () => {
        const expectedTerm: Term = {
            kind: 'Term',
            name: 'Org.OData.Capabilities.V1.Readable',
            type: 'Edm.Boolean',
            isCollection: false,
            description: 'Entities can be retrieved',
            defaultValue: true,
            appliesTo: ['EntitySet']
        };

        const term = vocabularyService.getTerm('Org.OData.Capabilities.V1.Readable');

        // Expect
        expect(term).toEqual(expectedTerm);
    });

    it('getVocabulary(com.sap.cap.vocabularies.ObjectModel) should return null', () => {
        // Expect
        expect(vocabularyService.getVocabulary('com.sap.cds.vocabularies.ObjectModel')).toBe(null);
    });

    it('verify cds specific assert.format annotation applies to', () => {
        const term = vocabularyService.getTerm('com.sap.vocabularies.CDS.v1.AssertFormat');
        // Expect
        expect(term?.appliesTo).toEqual(['Property', 'Parameter', 'Term']);
    });
});
