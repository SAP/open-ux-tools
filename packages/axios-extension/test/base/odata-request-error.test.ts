import type { ODataError } from '../../src/base/odata-request-error';
import { ODataRequestError } from '../../src/base/odata-request-error';

describe('ODataRequestError', () => {
    const error: ODataError = {
        message: 'Test Message',
        code: '42'
    };

    test('containsError', () => {
        expect(ODataRequestError.containsError({ error })).toBe(true);
        expect(ODataRequestError.containsError({})).toBe(false);
        expect(ODataRequestError.containsError(undefined)).toBe(false);
    });

    test('constructor', () => {
        const odataError: Error = new ODataRequestError({ error });
        expect(odataError.message).toContain(error.message);
    });
});
