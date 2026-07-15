import { getFlpId, getSemanticObject, getFloorplanLabel } from '../../src/app-helpers/app-helpers.js';
import { initI18n } from '../../src/i18n.js';
import { FloorplanFE, FloorplanFF } from '../../src/types/index.js';

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
        expect(getFloorplanLabel(FloorplanFE.FE_LROP)).toBe('List Report Page');
        expect(getFloorplanLabel(FloorplanFE.FE_FPM)).toBe('Custom Page');
        expect(getFloorplanLabel(FloorplanFE.FE_WORKLIST)).toBe('Worklist Page');
        expect(getFloorplanLabel(FloorplanFE.FE_ALP)).toBe('Analytical List Page');
        expect(getFloorplanLabel(FloorplanFE.FE_OVP)).toBe('Overview Page');
        expect(getFloorplanLabel(FloorplanFE.FE_FEOP)).toBe('Form Entry Object Page');
        expect(getFloorplanLabel(FloorplanFF.FF_SIMPLE)).toBe('Basic');
    });

    test('returns the templateType as fallback for unknown types', () => {
        expect(getFloorplanLabel('unknown-type' as any)).toBe('unknown-type');
    });

    test('appends odata version when provided', () => {
        expect(getFloorplanLabel(FloorplanFE.FE_LROP, '4')).toBe('List Report Page V4');
        expect(getFloorplanLabel(FloorplanFE.FE_LROP, '2')).toBe('List Report Page V2');
        expect(getFloorplanLabel(FloorplanFE.FE_LROP, undefined)).toBe('List Report Page');
    });
});
