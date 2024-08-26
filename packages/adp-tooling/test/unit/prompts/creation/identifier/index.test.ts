import type { Manifest } from '@sap-ux/project-access';

import type { Application } from '../../../../../src';
import { FlexLayer } from '../../../../../src';
import { AppIdentifier } from '../../../../../src/prompts/creation/identifier';
import { isV4Application } from '../../../../../src/prompts/creation/identifier/utils';
import { t } from '../../../../../src/i18n';

const isV4ApplicationMock = isV4Application as jest.Mock;

jest.mock('../../../../../src/prompts/creation/identifier/utils', () => ({
    isV4Application: jest.fn()
}));

describe('AppIdentifier', () => {
    let appIdentifier: AppIdentifier;

    beforeEach(() => {
        appIdentifier = new AppIdentifier(FlexLayer.CUSTOMER_BASE);
    });

    describe('validateSelectedApplication', () => {
        const application = { id: 'app1', fileType: 'appdescr_variant' };

        it('throws an error if application is null', () => {
            expect(() =>
                appIdentifier.validateSelectedApplication(null as unknown as Application, undefined, true, true)
            ).toThrow('Application has to be selected');
        });

        it('throws an error if manifest is null', () => {
            expect(() =>
                appIdentifier.validateSelectedApplication(application as Application, undefined, true, true)
            ).toThrow('Manifest of the selected application could not be validated');
        });

        it('throws an error if manifest flexEnabled is false', () => {
            const manifest = { 'sap.ui5': { flexEnabled: false } };

            expect(() =>
                appIdentifier.validateSelectedApplication(application as Application, manifest as Manifest, true, true)
            ).toThrow(t('validators.appDoesNotSupportAdaptation'));
        });

        it('should set internal mode and check for partial and full support', () => {
            const manifest = { 'sap.ui5': { flexEnabled: true } };

            isV4ApplicationMock.mockReturnValue(true);

            appIdentifier.validateSelectedApplication(application as Application, manifest as Manifest, true, true);

            expect(appIdentifier.isV4AppInternalMode).toBe(false);
            expect(appIdentifier.isSupported).toBe(false);
            expect(appIdentifier.isPartiallySupported).toBe(true);
        });

        it('checks whether adp over adp is fully or partially supported', () => {
            const manifest = {
                'sap.ui5': {
                    flexEnabled: true,
                    rootView: { async: false }
                }
            };

            isV4ApplicationMock.mockReturnValue(true);

            appIdentifier.validateSelectedApplication(application as Application, manifest as Manifest, true, true);

            expect(appIdentifier.getIsSupported()).toBe(false);
            expect(appIdentifier.getIsPartiallySupported()).toBe(true);
        });
    });

    describe('checkForSyncLoadedViews', () => {
        it('should set appSync to true if rootView is not async', () => {
            const ui5Settings = {
                rootView: {
                    async: false
                }
            };
            appIdentifier.checkForSyncLoadedViews(ui5Settings as Manifest['sap.ui5']);
            expect(appIdentifier.appSync).toBe(true);
        });

        it('should set appSync to false if routing config is async', () => {
            const ui5Settings = {
                routing: {
                    config: {
                        async: true
                    }
                }
            };
            appIdentifier.checkForSyncLoadedViews(ui5Settings as Manifest['sap.ui5']);
            expect(appIdentifier.appSync).toBe(false);
        });
    });
});
