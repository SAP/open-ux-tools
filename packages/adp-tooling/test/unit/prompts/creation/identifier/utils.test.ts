import type { Manifest } from '@sap-ux/project-access';

import { ApplicationType } from '../../../../../src';
import {
    isFioriElementsApp,
    isOVPApp,
    isSupportedType,
    isV4Application
} from '../../../../../src/prompts/creation/identifier/utils';

describe('AppIdentifier Utils', () => {
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

    describe('isV4Application', () => {
        it('returns true when manifest has "sap.fe.templates"', () => {
            const manifest = {
                'sap.ui5': {
                    dependencies: {
                        libs: {
                            'sap.fe.templates': {}
                        }
                    }
                }
            } as unknown as Manifest;
            expect(isV4Application(manifest)).toBe(true);
        });

        it('returns false when there is no manifest or no dependencies', () => {
            expect(isV4Application({} as Manifest)).toBe(false);
            expect(
                isV4Application({
                    'sap.ui5': {
                        resourceRoots: {}
                    }
                } as Manifest)
            ).toBe(false);
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
