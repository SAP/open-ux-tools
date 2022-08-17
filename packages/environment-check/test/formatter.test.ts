import { countNumberOfServices, getServiceCountText } from '../src/formatter';

/**
 * Tests countNumberOfServices()
 */
describe('Tests for formatter function countNumberOfServices', () => {
    test('Count number of V2 services', () => {
        const catalogResult = {
            results: [{}, {}, {}]
        };
        expect(countNumberOfServices(catalogResult)).toBe(3);
    });

    test('Count number of V4 services', () => {
        const catalogResult = {
            value: [
                { DefaultSystem: { Services: [{}] } },
                { DefaultSystem: { Services: [{}, {}] } },
                { DefaultSystem: { Services: [{}, {}, {}] } }
            ]
        };
        expect(countNumberOfServices(catalogResult)).toBe(6);
    });

    test('Count number of services on empty result', () => {
        expect(countNumberOfServices({})).toBe(0);
    });

    test('Count number of services on undefined result', () => {
        expect(countNumberOfServices(undefined)).toBe(0);
    });
});

/**
 * Tests getServiceCountText()
 */
describe('Tests for formatter function getServiceCountText', () => {
    test('One service', () => {
        expect(getServiceCountText(1)).toBe('1 service');
    });

    test('Multiple services', () => {
        expect(getServiceCountText(2)).toBe('2 services');
    });

    test('Zero services', () => {
        expect(getServiceCountText(0)).toBe('0 services');
    });
});
