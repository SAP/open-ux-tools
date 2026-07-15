import { getFlpId, getSemanticObject, getFloorplanLabel } from '../../src/app-helpers/app-helpers.js';
import { initI18n } from '../../src/i18n.js';

describe('app-helper tests', () => {
    test('should return flp id', () => {
        const flpId = getFlpId('a.b.c.testApp', 'display');
        expect(flpId).toBe('abctestApp-display');
    });

    test('should return semantic object', () => {
        const semObj = getSemanticObject('a.b.c.#testApp_#');
        expect(semObj).toBe('abctestApp');
    });

    test('should return correct length for semantic object', () => {
        const s = 'a.b.c.#testApp_#'.repeat(10);
        const semObj = getSemanticObject(s);
        expect(semObj.length).toBe(30);
    });
});

describe('getFloorplanLabel', () => {
    beforeAll(async () => {
        await initI18n();
    });
    test('returns translated label for known template types', () => {
        expect(getFloorplanLabel('lrop')).toBe('List Report Page');
        expect(getFloorplanLabel('fpm')).toBe('Custom Page');
        expect(getFloorplanLabel('worklist')).toBe('Worklist Page');
        expect(getFloorplanLabel('alp')).toBe('Analytical List Page');
        expect(getFloorplanLabel('ovp')).toBe('Overview Page');
        expect(getFloorplanLabel('feop')).toBe('Form Entry Object Page');
        expect(getFloorplanLabel('basic')).toBe('Basic');
    });

    test('returns the templateType as fallback for unknown types', () => {
        expect(getFloorplanLabel('unknown-type')).toBe('unknown-type');
    });

    test('appends odata version when provided', () => {
        expect(getFloorplanLabel('lrop', '4')).toBe('List Report Page V4');
        expect(getFloorplanLabel('lrop', '2')).toBe('List Report Page V2');
        expect(getFloorplanLabel('lrop', undefined)).toBe('List Report Page');
    });
});
