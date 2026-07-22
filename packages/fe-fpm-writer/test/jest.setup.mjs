import { jest } from '@jest/globals';

// Forward onError as errorHandler so tests running against 0.8.x xmldom (pnpm override)
// behave like 0.9.x which renamed errorHandler to onError
jest.mock('@xmldom/xmldom', () => {
    const actual = jest.requireActual('@xmldom/xmldom');
    return {
        ...actual,
        DOMParser: function DOMParser(options) {
            return new actual.DOMParser(options?.onError ? { ...options, errorHandler: options.onError } : options);
        }
    };
});
