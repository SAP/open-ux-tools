import { Severity } from '@sap-devx/yeoman-ui-types';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import {
    appAdditionalMessages,
    systemAdditionalMessages
} from '../../../../src/app/questions/helper/additional-messages';
import type { AppIdentifier } from '../../../../src/app/app-identifier';
import { t } from '../../../../src/utils/i18n';

describe('additional-messages', () => {
    describe('systemAdditionalMessages', () => {
        it('should return CLOUD_READY info message for cloud project', () => {
            const result = systemAdditionalMessages(undefined, true);
            expect(result).toEqual({
                message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.CLOUD_READY}`,
                severity: Severity.information
            });
        });

        it('should return not deployable and not flex enabled error if not on-premise and not UIFlex', () => {
            const result = systemAdditionalMessages({ isOnPremise: false, isUIFlex: false }, false);
            expect(result).toEqual({
                message: t('error.notDeployableNotFlexEnabledSystemError'),
                severity: Severity.error
            });
        });

        it('should return not deployable system error if not on-premise but UIFlex is true', () => {
            const result = systemAdditionalMessages({ isOnPremise: false, isUIFlex: true }, false);
            expect(result).toEqual({
                message: t('error.notDeployableSystemError'),
                severity: Severity.error
            });
        });

        it('should return not flex enabled warning if on-premise but UIFlex is false', () => {
            const result = systemAdditionalMessages({ isOnPremise: true, isUIFlex: false }, false);
            expect(result).toEqual({
                message: t('error.notFlexEnabledError'),
                severity: Severity.warning
            });
        });

        it('should return ON_PREMISE info if on-premise and UIFlex is true', () => {
            const result = systemAdditionalMessages({ isOnPremise: true, isUIFlex: true }, false);
            expect(result).toEqual({
                message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.ON_PREMISE}`,
                severity: Severity.information
            });
        });
    });

    describe('appAdditionalMessages', () => {
        const mockApp = { id: 'some.app' } as any;

        it('should return undefined if no app is passed', () => {
            expect(appAdditionalMessages(undefined as any, {} as any, true)).toBeUndefined();
        });

        it('should return info if app is sync and supported', () => {
            const appIdentifier = {
                appSync: true,
                getIsSupported: jest.fn().mockReturnValue(true),
                getIsPartiallySupported: jest.fn().mockReturnValue(false),
                v4AppInternalMode: false
            };

            const result = appAdditionalMessages(mockApp, appIdentifier as unknown as AppIdentifier, true);
            expect(result).toEqual({
                message: t('prompts.appInfoLabel'),
                severity: Severity.information
            });
        });

        it('should return not supported warning for adp-over-adp when not supported and not partially supported', () => {
            const appIdentifier = {
                appSync: false,
                getIsSupported: jest.fn().mockReturnValue(false),
                getIsPartiallySupported: jest.fn().mockReturnValue(false),
                v4AppInternalMode: false
            };

            const result = appAdditionalMessages(mockApp, appIdentifier as unknown as AppIdentifier, true);
            expect(result).toEqual({
                message: t('prompts.notSupportedAdpOverAdpLabel'),
                severity: Severity.warning
            });
        });

        it('should return partially supported warning', () => {
            const appIdentifier = {
                appSync: false,
                getIsSupported: jest.fn().mockReturnValue(true),
                getIsPartiallySupported: jest.fn().mockReturnValue(true),
                v4AppInternalMode: false
            };

            const result = appAdditionalMessages(mockApp, appIdentifier as unknown as AppIdentifier, true);
            expect(result).toEqual({
                message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
                severity: Severity.warning
            });
        });

        it('should return v4 not officially supported warning', () => {
            const appIdentifier = {
                appSync: false,
                getIsSupported: jest.fn().mockReturnValue(true),
                getIsPartiallySupported: jest.fn().mockReturnValue(false),
                v4AppInternalMode: true
            };

            const result = appAdditionalMessages(mockApp, appIdentifier as unknown as AppIdentifier, false);
            expect(result).toEqual({
                message: 'prompts.v4AppNotOfficialLabel',
                severity: Severity.warning
            });
        });
    });
});
