import { identifierTokens, identifierWords } from '../../src/naming.js';

describe('identifier naming', () => {
    it('splits camel case, acronyms, underscores and hyphens into words that keep their case', () => {
        // Given SAP and CAP style identifiers
        // When they are split into words
        // Then each delimiter starts a new word and case is preserved
        expect(identifierWords('BookingStatus_code')).toEqual(['Booking', 'Status', 'code']);
        expect(identifierWords('HTTPServer')).toEqual(['HTTP', 'Server']);
        expect(identifierWords('to_Booking-item')).toEqual(['to', 'Booking', 'item']);
        expect(identifierWords('Item2Name')).toEqual(['Item2', 'Name']);
        expect(identifierWords('  ')).toEqual([]);
    });

    it('keeps a capital run joined to the next word when acronym splitting is off', () => {
        // Given an identifier with a capital run before a capitalised word
        // When it is split with and without acronym splitting
        // Then only the default splits the run from the word
        expect(identifierTokens('ORDERId')).toEqual(['order', 'id']);
        expect(identifierTokens('ORDERId', { splitAcronyms: false })).toEqual(['orderid']);
    });

    it('lowercases tokens and, when asked, keeps only their letters', () => {
        // Given an identifier with digits
        // When it is tokenized with and without the letters-only option
        // Then digits stay inside tokens by default and split tokens otherwise
        expect(identifierTokens('Valid2From')).toEqual(['valid2', 'from']);
        expect(identifierTokens('Valid2From', { splitAcronyms: false, lettersOnly: true })).toEqual(['valid', 'from']);
    });

    it('keeps identifiers in other scripts whole instead of splitting them', () => {
        // Given an identifier outside ASCII
        // When it is tokenized
        // Then only ASCII case boundaries split, so the non-ASCII run stays one token
        expect(identifierTokens('ÄnderungDatum')).toEqual(['änderung', 'datum']);
        expect(identifierTokens('Ä_Ö')).toEqual(['ä', 'ö']);
    });

    it('drops non-ASCII letters in letters-only mode, which is meant for English vocabularies', () => {
        // Given an identifier starting with a non-ASCII letter
        // When it is tokenized letters-only
        // Then the non-ASCII letter acts as a delimiter
        expect(identifierTokens('Änderung', { lettersOnly: true })).toEqual(['nderung']);
    });
});
