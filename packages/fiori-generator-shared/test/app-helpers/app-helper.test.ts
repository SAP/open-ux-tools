import {
    getFlpId,
    getSemanticObject,
    getFloorplanLabel,
    getFloorplanDescription
} from '../../src/app-helpers/app-helpers.js';
import { initI18n, t } from '../../src/i18n.js';
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
        expect(getFloorplanLabel(FloorplanFE.FE_LROP)).toBe(t('floorplans.label.lrop'));
        expect(getFloorplanLabel(FloorplanFE.FE_FPM)).toBe(t('floorplans.label.fpm'));
        expect(getFloorplanLabel(FloorplanFE.FE_WORKLIST)).toBe(t('floorplans.label.worklist'));
        expect(getFloorplanLabel(FloorplanFE.FE_ALP)).toBe(t('floorplans.label.alp'));
        expect(getFloorplanLabel(FloorplanFE.FE_OVP)).toBe(t('floorplans.label.ovp'));
        expect(getFloorplanLabel(FloorplanFE.FE_FEOP)).toBe(t('floorplans.label.feop'));
        expect(getFloorplanLabel(FloorplanFF.FF_SIMPLE)).toBe(t('floorplans.label.basic'));
    });

    test('returns the templateType as fallback for unknown types', () => {
        expect(getFloorplanLabel('unknown-type' as any)).toBe('unknown-type');
    });

    test('appends odata version when provided', () => {
        expect(getFloorplanLabel(FloorplanFE.FE_LROP, '4')).toBe(t('floorplans.label.lrop', { odataVersion: '4' }));
        expect(getFloorplanLabel(FloorplanFE.FE_LROP, '2')).toBe(t('floorplans.label.lrop', { odataVersion: '2' }));
        expect(getFloorplanLabel(FloorplanFE.FE_LROP, undefined)).toBe(t('floorplans.label.lrop'));
    });
});

describe('getFloorplanDescription', () => {
    beforeAll(async () => {
        await initI18n();
    });

    test('returns translated description for known template types', () => {
        expect(getFloorplanDescription(FloorplanFF.FF_SIMPLE)).toBe(t('floorplans.description.basic'));
        expect(getFloorplanDescription(FloorplanFE.FE_LROP)).toBe(t('floorplans.description.lrop'));
        expect(getFloorplanDescription(FloorplanFE.FE_FPM)).toBe(t('floorplans.description.fpm'));
        expect(getFloorplanDescription(FloorplanFE.FE_WORKLIST)).toBe(t('floorplans.description.worklist'));
        expect(getFloorplanDescription(FloorplanFE.FE_ALP)).toBe(t('floorplans.description.alp'));
        expect(getFloorplanDescription(FloorplanFE.FE_OVP)).toBe(t('floorplans.description.ovp'));
        expect(getFloorplanDescription(FloorplanFE.FE_FEOP)).toBe(t('floorplans.description.feop'));
    });

    test('returns empty string for unknown template type', () => {
        expect(getFloorplanDescription('unknown-type' as any)).toBe('');
    });
});
