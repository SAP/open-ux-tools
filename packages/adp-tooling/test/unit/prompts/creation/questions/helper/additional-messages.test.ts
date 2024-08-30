import { Severity } from '@sap-devx/yeoman-ui-types';
import { AdaptationProjectType } from '@sap-ux/axios-extension';

import { t } from '../../../../../../src/i18n';
import type { AppIdentifier } from '../../../../../../src/prompts/creation/identifier';
import type { Application, ConfigInfoPrompter, ConfigurationInfoAnswers } from '../../../../../../src';
import {
    appAdditionalMessages,
    projectTypeAdditionalMessages,
    systemAdditionalMessages,
    versionAdditionalMessages
} from '../../../../../../src';

describe('additional messages', () => {
    describe('systemAdditionalMessages', () => {
        it('should return undefined if no project types are available', () => {
            const result = systemAdditionalMessages(undefined, {
                adaptationProjectTypes: [],
                activeLanguages: []
            });
            expect(result).toBeUndefined();
        });

        it('should return undefined if it is a cloud project', () => {
            const flexUISystem = { isOnPremise: false, isUIFlex: false };
            const result = systemAdditionalMessages(flexUISystem, {
                adaptationProjectTypes: [AdaptationProjectType.CLOUD_READY],
                activeLanguages: []
            });
            expect(result).toBeUndefined();
        });

        it('should return undefined if all conditions pass', () => {
            const flexUISystem = { isOnPremise: true, isUIFlex: true };
            const result = systemAdditionalMessages(flexUISystem, {
                adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE, AdaptationProjectType.CLOUD_READY],
                activeLanguages: []
            });
            expect(result).toBeUndefined();
        });

        it('should return error message when system is not on premise and UI Flex is disabled', () => {
            const flexUISystem = { isOnPremise: false, isUIFlex: false };
            const systemInfo = { adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE], activeLanguages: [] };
            const expected = {
                message: t('validators.notDeployableNotFlexEnabledSystemError'),
                severity: Severity.error
            };
            const result = systemAdditionalMessages(flexUISystem, systemInfo);
            expect(result).toEqual(expected);
        });

        it('should return error message when system is not on premise and UI Flex is enabled', () => {
            const flexUISystem = { isOnPremise: false, isUIFlex: true };
            const systemInfo = { adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE], activeLanguages: [] };
            const expected = {
                message: t('validators.notDeployableSystemError'),
                severity: Severity.error
            };
            const result = systemAdditionalMessages(flexUISystem, systemInfo);
            expect(result).toEqual(expected);
        });

        it('should return warning when system is on premise but UI Flex is disabled', () => {
            const flexUISystem = { isOnPremise: true, isUIFlex: false };
            const systemInfo = { adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE], activeLanguages: [] };
            const expected = {
                message: t('validators.notFlexEnabledError'),
                severity: Severity.warning
            };
            const result = systemAdditionalMessages(flexUISystem, systemInfo);
            expect(result).toEqual(expected);
        });
    });

    describe('appAdditionalMessages', () => {
        const app = { id: '1', title: 'Test App' };

        it('should return undefined if no application is provided', () => {
            const result = appAdditionalMessages(undefined as unknown as Application, {} as ConfigInfoPrompter);
            expect(result).toBeUndefined();
        });

        it('should provide informational message if appSync is true and application is supported', () => {
            const expected = {
                message: t('prompts.appInfoLabel'),
                severity: Severity.information
            };
            const prompter = {
                isApplicationSupported: true,
                appIdentifier: {
                    appSync: true
                } as unknown as AppIdentifier
            } as ConfigInfoPrompter;

            const result = appAdditionalMessages(app as Application, prompter);
            expect(result).toEqual(expected);
        });

        it('should provide warning message if adp over adp is not supported', () => {
            const expected = {
                message: t('prompts.notSupportedAdpOverAdpLabel'),
                severity: Severity.warning
            };
            const prompter = {
                isApplicationSupported: true,
                appIdentifier: {
                    appSync: false,
                    getIsSupported: jest.fn().mockReturnValue(false),
                    getIsPartiallySupported: jest.fn().mockReturnValue(false)
                } as unknown as AppIdentifier
            } as ConfigInfoPrompter;

            const result = appAdditionalMessages(app as Application, prompter);
            expect(result).toEqual(expected);
        });

        it('should provide warning when adp over adp is partially supported', () => {
            const expected = {
                message: t('prompts.isPartiallySupportedAdpOverAdpLabel'),
                severity: Severity.warning
            };
            const prompter = {
                isApplicationSupported: true,
                appIdentifier: {
                    appSync: false,
                    isV4AppInternalMode: false,
                    getIsSupported: jest.fn().mockReturnValue(true),
                    getIsPartiallySupported: jest.fn().mockReturnValue(true)
                } as unknown as AppIdentifier
            } as ConfigInfoPrompter;
            const result = appAdditionalMessages(app as Application, prompter);
            expect(result).toEqual(expected);
        });

        it('should provide warning for V4 apps in internal mode', () => {
            const expected = {
                message: t('prompts.v4AppNotOfficialLabel'),
                severity: Severity.warning
            };
            const prompter = {
                appIdentifier: {
                    appSync: false,
                    isV4AppInternalMode: true,
                    getIsSupported: jest.fn().mockReturnValue(true),
                    getIsPartiallySupported: jest.fn().mockReturnValue(false)
                } as unknown as AppIdentifier
            } as ConfigInfoPrompter;
            const result = appAdditionalMessages(app as Application, prompter);
            expect(result).toEqual(expected);
        });
    });

    describe('versionAdditionalMessages', () => {
        const prompter = {
            ui5VersionDetected: false,
            isCloudProject: false,
            hasSystemAuthentication: true,
            isLoginSuccessfull: true,
            shouldAuthenticate: jest.fn().mockReturnValue(false)
        } as unknown as ConfigInfoPrompter;

        it('should provide a warning when UI5 version is not detected', () => {
            const answers = { system: 'U1Y_010' } as ConfigurationInfoAnswers;
            const expected = {
                message: t('validators.ui5VersionNotDetectedError'),
                severity: Severity.warning
            };
            const result = versionAdditionalMessages(answers, prompter);
            expect(result).toEqual(expected);
        });
    });

    describe('projectTypeAdditionalMessages', () => {
        const prompter = {
            shouldAuthenticate: jest.fn().mockReturnValue(false),
            isCloudProject: true,
            ui5Manager: {
                latestVersion: '1.127.0'
            }
        } as unknown as ConfigInfoPrompter;

        it('should return information message when the project is cloud based', () => {
            const answers = { system: 'CAC_080' } as ConfigurationInfoAnswers;
            const expected = {
                message: t('prompts.currentUI5VersionLabel', { version: '1.127.0' }),
                severity: Severity.information
            };
            const result = projectTypeAdditionalMessages(answers, prompter);
            expect(result).toEqual(expected);
        });
    });
});
