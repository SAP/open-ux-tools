import type { ODataServiceInfo } from '@sap-ux/axios-extension';
import { countNumberOfServices, getCircularReplacer, getServiceCountText } from '../src/formatter';

/**
 * Tests countNumberOfServices()
 */
describe('Tests for formatter function countNumberOfServices', () => {
    test('Count number of services', () => {
        const catalogResult = {
            results: [{}, {}, {}] as ODataServiceInfo[]
        };
        expect(countNumberOfServices(catalogResult.results)).toBe(3);
    });

    test('Count number of services on empty result', () => {
        expect(countNumberOfServices([])).toBe(0);
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

describe('Tests for formatter function stringify()', () => {
    test('Object without circular structures', () => {
        const result = JSON.stringify({ ak: 'av', obj: { arr: [1, 2, 3], k: 'v' } }, getCircularReplacer());
        expect(result).toBe(JSON.stringify({ 'ak': 'av', 'obj': { 'arr': [1, 2, 3], 'k': 'v' } }));
    });

    test('Object with circular structures to self', () => {
        const obj: any = { prop: 'val' };
        obj.selfRef = obj;
        const result = JSON.stringify(obj, getCircularReplacer());
        expect(result).toBe(JSON.stringify({ 'prop': 'val', 'selfRef': '|CIRCULAR STRUCTURE|' }));
    });

    test('Object with circular structures to self nested', () => {
        const obj: any = { prop: 'val' };
        obj.circular = { selfRef: obj };
        const result = JSON.stringify(obj, getCircularReplacer());
        expect(result).toBe(JSON.stringify({ 'prop': 'val', 'circular': { 'selfRef': '|CIRCULAR STRUCTURE|' } }));
    });

    test('Object with deep circular structures', () => {
        const obj: any = { prop: 'val', child: { cprop: 'cval' } };
        obj.child.selfRef = obj.child;
        const result = JSON.stringify(obj, getCircularReplacer());
        expect(result).toBe(
            JSON.stringify({ 'prop': 'val', 'child': { 'cprop': 'cval', 'selfRef': '|CIRCULAR STRUCTURE .child|' } })
        );
    });
});
