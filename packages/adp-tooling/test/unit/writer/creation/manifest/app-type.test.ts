import type { Manifest } from '@sap-ux/project-access';

import { ApplicationType } from '../../../../../src';
import { getApplicationType } from '../../../../../src/writer/creation/manifest';

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
});
