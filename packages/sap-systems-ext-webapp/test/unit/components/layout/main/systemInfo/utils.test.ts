import { getUrlErrorMessage } from '../../../../../../src/components/layout/main/systemInfo/utils';
import type { TFunction } from 'i18next';

describe('getUrlErrorMessage', () => {
    const mockT = ((key: string) => key) as TFunction;
    let setIsDetailsValid: jest.Mock;

    beforeEach(() => {
        setIsDetailsValid = jest.fn();
    });

    it('should return undefined for valid URL without pathname', () => {
        // Given a valid URL without pathname
        const validUrl = 'https://example.com';

        // When validating the URL
        const result = getUrlErrorMessage(validUrl, mockT, setIsDetailsValid);

        // Then no error message should be returned and details should be valid
        expect(result).toBeUndefined();
        expect(setIsDetailsValid).toHaveBeenCalledWith(true);
    });

    it('should return undefined for valid URL with root pathname', () => {
        // Given a valid URL with root pathname
        const validUrl = 'https://example.com/';

        // When validating the URL
        const result = getUrlErrorMessage(validUrl, mockT, setIsDetailsValid);

        // Then no error message should be returned and details should be valid
        expect(result).toBeUndefined();
        expect(setIsDetailsValid).toHaveBeenCalledWith(true);
    });

    it('should return error message for URL with pathname beyond root', () => {
        // Given a URL with pathname beyond root
        const urlWithPath = 'https://example.com/some/path';

        // When validating the URL
        const result = getUrlErrorMessage(urlWithPath, mockT, setIsDetailsValid);

        // Then an error message should be returned and details should be invalid
        expect(result).toBe('validations.systemUrlOriginOnlyWarning');
        expect(setIsDetailsValid).toHaveBeenCalledWith(false);
    });

    it('should allow pathname for odata_service connection type', () => {
        // Given a URL with pathname and odata_service connection type
        const urlWithPath = 'https://example.com/some/path';

        // When validating the URL with odata_service connection type
        const result = getUrlErrorMessage(urlWithPath, mockT, setIsDetailsValid, 'odata_service');

        // Then no error message should be returned and details should be valid
        expect(result).toBeUndefined();
        expect(setIsDetailsValid).toHaveBeenCalledWith(true);
    });

    it('should return error message for invalid URL (covers lines 28-29)', () => {
        // Given an invalid URL string
        const invalidUrl = 'not-a-valid-url';

        // When validating the invalid URL
        const result = getUrlErrorMessage(invalidUrl, mockT, setIsDetailsValid);

        // Then an error message should be returned and details should be invalid
        expect(result).toBe('validations.systemUrlOriginOnlyWarning');
        expect(setIsDetailsValid).toHaveBeenCalledWith(false);
    });

    it('should return error message for empty URL string', () => {
        // Given an empty URL string
        const emptyUrl = '';

        // When validating the empty URL
        const result = getUrlErrorMessage(emptyUrl, mockT, setIsDetailsValid);

        // Then an error message should be returned and details should be invalid
        expect(result).toBe('validations.systemUrlOriginOnlyWarning');
        expect(setIsDetailsValid).toHaveBeenCalledWith(false);
    });

    it('should return error message for malformed URL without protocol', () => {
        // Given a malformed URL without a valid protocol
        const malformedUrl = 'just some text';

        // When validating the malformed URL
        const result = getUrlErrorMessage(malformedUrl, mockT, setIsDetailsValid);

        // Then an error message should be returned and details should be invalid
        expect(result).toBe('validations.systemUrlOriginOnlyWarning');
        expect(setIsDetailsValid).toHaveBeenCalledWith(false);
    });
});
