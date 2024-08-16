import type { Manifest } from '@sap-ux/project-access';

import type { Application } from '../../../../src';
import {
    AppIdentifier,
    isV4Application,
    getApplicationType,
    isSupportedType,
    FlexLayer,
    ApplicationType
} from '../../../../src';

const isV4ApplicationMock = isV4Application as jest.Mock;
const getApplicationTypeMock = getApplicationType as jest.Mock;
const isSupportedTypeMock = isSupportedType as jest.Mock;

jest.mock('../../../../src/base/services/manifest-service.ts', () => ({
    isV4Application: jest.fn()
}));

jest.mock('../../../../src/base/app-utils.ts', () => ({
    getApplicationType: jest.fn(),
    isSupportedType: jest.fn()
}));

describe('AppIdentifier', () => {
    let appIdentifier: AppIdentifier;

    beforeEach(() => {
        appIdentifier = new AppIdentifier(FlexLayer.CUSTOMER_BASE);
    });

    describe('validateSelectedApplication', () => {
        it('throws an error if application is null', async () => {
            await expect(
                appIdentifier.validateSelectedApplication(null as unknown as Application, null, true, true)
            ).rejects.toThrow('Application has to be selected');
        });

        it('throws an error if manifest is null', async () => {
            const application = { id: 'app1', fileType: 'appdescr_variant' };
            await expect(
                appIdentifier.validateSelectedApplication(application as Application, null, true, true)
            ).rejects.toThrow('Manifest of the selected application could not be validated');
        });

        it('should set internal mode and check for partial and full support based on the application type', async () => {
            const application = { id: 'app1', fileType: 'appdescr_variant' };
            const manifest = { 'sap.ui5': {} };

            isV4ApplicationMock.mockReturnValue(true);
            getApplicationTypeMock.mockReturnValue(ApplicationType.FREE_STYLE);
            isSupportedTypeMock.mockReturnValue(true);

            await appIdentifier.validateSelectedApplication(
                application as Application,
                manifest as Manifest,
                true,
                true
            );

            expect(appIdentifier.isV4AppInternalMode).toBe(false);
            expect(appIdentifier.isSupportedAdpOverAdp).toBe(false);
            expect(appIdentifier.isPartiallySupportedAdpOverAdp).toBe(true);
        });

        it('checks whether adp over adp is fully or partially supported', async () => {
            const application = { id: 'app1', fileType: 'appdescr_variant' };
            const manifest = {
                'sap.ui5': {
                    flexEnabled: true,
                    rootView: { async: false }
                }
            };

            getApplicationTypeMock.mockReturnValue(ApplicationType.FREE_STYLE);
            isSupportedTypeMock.mockReturnValue(true);
            isV4ApplicationMock.mockReturnValue(true);

            await appIdentifier.validateSelectedApplication(
                application as Application,
                manifest as Manifest,
                true,
                true
            );

            expect(appIdentifier.getIsSupportedAdpOverAdp()).toBe(false);
            expect(appIdentifier.getIsPartiallySupportedAdpOverAdp()).toBe(true);
        });
    });

    describe('validateSmartTemplateApplication', () => {
        it('throws an error if application does not support adaptation', async () => {
            const manifest = { 'sap.ui5': { flexEnabled: false } };
            getApplicationTypeMock.mockReturnValue(ApplicationType.FREE_STYLE);
            isSupportedTypeMock.mockReturnValue(true);
            isV4ApplicationMock.mockReturnValue(true);

            await expect(appIdentifier.validateSmartTemplateApplication(manifest as Manifest)).rejects.toThrow(
                'Select a different application. Selected application does not support Flexibility and therefore it does not support Adaptation Project.'
            );
        });

        it('throws an error if adaptation project does not support selected application type', async () => {
            const manifest = { 'sap.ui5': { flexEnabled: false } };
            getApplicationTypeMock.mockReturnValue(ApplicationType.NONE);
            isSupportedTypeMock.mockReturnValue(false);
            isV4ApplicationMock.mockReturnValue(true);

            await expect(appIdentifier.validateSmartTemplateApplication(manifest as Manifest)).rejects.toThrow(
                "Select a different application. Adaptation project doesn't support the selected application."
            );
        });

        it('should check for sync loaded views if application supports adaptation', async () => {
            const manifest = {
                'sap.ui5': {
                    flexEnabled: true,
                    rootView: { async: false }
                }
            };
            getApplicationTypeMock.mockReturnValue(ApplicationType.FREE_STYLE);
            isSupportedTypeMock.mockReturnValue(true);
            isV4ApplicationMock.mockReturnValue(true);

            await appIdentifier.validateSmartTemplateApplication(manifest as Manifest);

            expect(appIdentifier.appSync).toBe(true);
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
