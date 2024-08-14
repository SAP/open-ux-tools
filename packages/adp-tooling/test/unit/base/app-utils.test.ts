import type { Manifest } from '@sap-ux/project-access';

import { ApplicationType, getApplicationType, isFioriElementsApp, isOVPApp, isSupportedType } from '../../../src';

describe('app-utils', () => {
    describe('getApplicationType', () => {
        it('should return FIORI_ELEMENTS_OVP when manifest contains sap.ovp', () => {
            const manifest = { 'sap.ovp': {} };
            expect(getApplicationType(manifest as Manifest)).toBe(ApplicationType.FIORI_ELEMENTS_OVP);
        });

        it('should return FIORI_ELEMENTS when manifest contains sap.ui.generic.app', () => {
            const manifest = { 'sap.ui.generic.app': {} };
            expect(getApplicationType(manifest as Manifest)).toBe(ApplicationType.FIORI_ELEMENTS);
        });

        it('should return FIORI_ELEMENTS when sap.app has a sourceTemplate id of ui5template.smarttemplate', () => {
            const manifest = { 'sap.app': { sourceTemplate: { id: 'UI5Template.SmartTemplate' } } };
            expect(getApplicationType(manifest as Manifest)).toBe(ApplicationType.FIORI_ELEMENTS);
        });

        it('should return FREE_STYLE when manifest does not match any specific type', () => {
            const manifest = { 'sap.app': {} };
            expect(getApplicationType(manifest as Manifest)).toBe(ApplicationType.FREE_STYLE);
        });

        it('should return NONE for an empty manifest', () => {
            const manifest = {};
            expect(getApplicationType(manifest as Manifest)).toBe(ApplicationType.NONE);
        });
    });

    describe('isFioriElementsApp', () => {
        it('returns true for FIORI_ELEMENTS', () => {
            expect(isFioriElementsApp(ApplicationType.FIORI_ELEMENTS)).toBe(true);
        });

        it('returns true for FIORI_ELEMENTS_OVP', () => {
            expect(isFioriElementsApp(ApplicationType.FIORI_ELEMENTS_OVP)).toBe(true);
        });

        it('returns false for FREE_STYLE', () => {
            expect(isFioriElementsApp(ApplicationType.FREE_STYLE)).toBe(false);
        });
    });

    describe('isOVPApp', () => {
        it('returns true for FIORI_ELEMENTS_OVP', () => {
            expect(isOVPApp(ApplicationType.FIORI_ELEMENTS_OVP)).toBe(true);
        });

        it('returns false for FIORI_ELEMENTS', () => {
            expect(isOVPApp(ApplicationType.FIORI_ELEMENTS)).toBe(false);
        });
    });

    describe('isSupportedType', () => {
        it('returns true for FIORI_ELEMENTS', () => {
            expect(isSupportedType(ApplicationType.FIORI_ELEMENTS)).toBe(true);
        });

        it('returns true for FREE_STYLE', () => {
            expect(isSupportedType(ApplicationType.FREE_STYLE)).toBe(true);
        });

        it('returns true for FIORI_ELEMENTS_OVP', () => {
            expect(isSupportedType(ApplicationType.FIORI_ELEMENTS_OVP)).toBe(true);
        });

        it('returns false for NONE', () => {
            expect(isSupportedType(ApplicationType.NONE)).toBe(false);
        });
    });
});
