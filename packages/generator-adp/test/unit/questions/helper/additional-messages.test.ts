import { Severity } from '@sap-devx/yeoman-ui-types';

import type { SourceApplication } from '@sap-ux/adp-tooling';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import {
    getAppAdditionalMessages,
    getSystemAdditionalMessages,
    getVersionAdditionalMessages,
    getTargetEnvAdditionalMessages
} from '../../../../src/app/questions/helper/additional-messages';
import { t } from '../../../../src/utils/i18n';

describe('additional-messages', () => {
    describe('getSystemAdditionalMessages', () => {
        it('should return undefined if flexUISystem is undefined', () => {
            const result = getSystemAdditionalMessages(undefined, false);
            expect(result).toBeUndefined();
        });

        it('should return CLOUD_READY info message for cloud project', () => {
            const result = getSystemAdditionalMessages(undefined, true);
            expect(result).toEqual({
                message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.CLOUD_READY}`,
                severity: Severity.information
            });
        });

        it('should return not deployable and not flex enabled error if not on-premise and not UIFlex', () => {
            const result = getSystemAdditionalMessages({ isOnPremise: false, isUIFlex: false }, false);
            expect(result).toEqual({
                message: t('error.notDeployableNotFlexEnabledSystemError'),
                severity: Severity.error
            });
        });

        it('should return not deployable system error if not on-premise but UIFlex is true', () => {
            const result = getSystemAdditionalMessages({ isOnPremise: false, isUIFlex: true }, false);
            expect(result).toEqual({
                message: t('error.notDeployableSystemError'),
                severity: Severity.error
            });
        });

        it('should return not flex enabled warning if on-premise but UIFlex is false', () => {
            const result = getSystemAdditionalMessages({ isOnPremise: true, isUIFlex: false }, false);
            expect(result).toEqual({
                message: t('error.notFlexEnabledError'),
                severity: Severity.warning
            });
        });

        it('should return ON_PREMISE info if on-premise and UIFlex is true', () => {
            const result = getSystemAdditionalMessages({ isOnPremise: true, isUIFlex: true }, false);
            expect(result).toEqual({
                message: `${t('prompts.projectTypeLabel')}: ${AdaptationProjectType.ON_PREMISE}`,
                severity: Severity.information
            });
        });
    });

    describe('getAppAdditionalMessages', () => {
        const mockApp = { id: 'app-id', title: 'Test App' } as SourceApplication;

        it('returns undefined when app is not provided', () => {
            const result = getAppAdditionalMessages(
                undefined as any,
                { hasSyncViews: false, isSupported: false, isPartiallySupported: false, isV4AppInternalMode: false },
                true
            );
            expect(result).toBeUndefined();
        });

        it('returns info message when app is sync and supported', () => {
            const result = getAppAdditionalMessages(
                mockApp,
                { hasSyncViews: true, isSupported: true, isPartiallySupported: false, isV4AppInternalMode: false },
                true
            );
            expect(result).toEqual({
                message: t('prompts.appInfoLabel'),
                severity: Severity.information
            });
        });

        it('returns warning when app is not supported and not partially supported', () => {
            const result = getAppAdditionalMessages(
                mockApp,
                { hasSyncViews: false, isSupported: false, isPartiallySupported: false, isV4AppInternalMode: false },
                true
            );
            expect(result).toEqual({
                message: t('prompts.notSupportedAdpOverAdpLabel'),
                severity: Severity.warning
            });
        });

        it('returns warning when app is partially supported', () => {
            const result = getAppAdditionalMessages(
                mockApp,
                { hasSyncViews: false, isSupported: true, isPartiallySupported: true, isV4AppInternalMode: false },
                true
            );
            expect(result).toEqual({
                message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
                severity: Severity.warning
            });
        });

        it('returns warning when app is a V4 internal mode app', () => {
            const result = getAppAdditionalMessages(
                mockApp,
                { hasSyncViews: false, isSupported: true, isPartiallySupported: false, isV4AppInternalMode: true },
                true
            );
            expect(result).toEqual({
                message: t('prompts.v4AppNotOfficialLabel'),
                severity: Severity.warning
            });
        });

        it('returns undefined when none of the conditions are met', () => {
            const result = getAppAdditionalMessages(
                mockApp,
                { hasSyncViews: false, isSupported: true, isPartiallySupported: false, isV4AppInternalMode: false },
                false
            );
            expect(result).toBeUndefined();
        });
    });

    describe('getVersionAdditionalMessages', () => {
        it('should return warning message if version is not detected', () => {
            const result = getVersionAdditionalMessages(false);

            expect(result).toEqual({
                message: t('validators.ui5VersionNotDetectedError'),
                severity: Severity.warning
            });
        });

        it('should return undefined when version is detected', () => {
            const result = getVersionAdditionalMessages(true);
            expect(result).toBeUndefined();
        });
    });

    describe('getTargetEnvAdditionalMessages', () => {
        const mockCfConfig = {
            url: 'https://test.cf.com',
            org: { Name: 'test-org' },
            space: { Name: 'test-space' }
        };

        it('should return information when CF selected and logged in', () => {
            const result = getTargetEnvAdditionalMessages('CF', true, mockCfConfig);

            expect(result).toEqual({
                message: 'You are logged in to Cloud Foundry: https://test.cf.com / test-org / test-space.',
                severity: Severity.information
            });
        });

        it('should return undefined when not CF environment', () => {
            const result = getTargetEnvAdditionalMessages('ABAP', true, mockCfConfig);
            expect(result).toBeUndefined();
        });
    });
});
