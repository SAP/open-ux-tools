import { AdaptationProjectType } from '@sap-ux/axios-extension';
import {
    showInternalQuestions,
    showUI5VersionQuestion,
    showProjectTypeQuestion,
    showApplicationErrorQuestion,
    showApplicationQuestion,
    showCredentialQuestion,
    showExtensionProjectQuestion
} from '../../../../../../src/prompts/creation/questions/helper/conditions';
import type { AppIdentifier } from '../../../../../../src/prompts/creation/identifier';
import type { Application, ConfigInfoPrompter, ConfigurationInfoAnswers } from '../../../../../../src';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn().mockReturnValue(true)
}));

describe('Visibility Tests', () => {
    const prompter = {} as ConfigInfoPrompter;
    let answers: ConfigurationInfoAnswers;

    beforeEach(() => {
        prompter.isCustomerBase = false;
        prompter.shouldAuthenticate = jest.fn().mockReturnValue(false);
        prompter.isApplicationSupported = true;
        prompter.isCloudProject = false;
        prompter.hasSystemAuthentication = true;
        prompter.isLoginSuccessfull = true;
        prompter.appIdentifier = {
            appSync: false
        } as AppIdentifier;
        prompter.systemInfo = {
            adaptationProjectTypes: [AdaptationProjectType.ON_PREMISE, AdaptationProjectType.CLOUD_READY],
            activeLanguages: []
        };
        prompter.flexUISystem = {
            isOnPremise: true,
            isUIFlex: false
        };

        answers = {
            system: 'U1Y_010',
            application: {
                id: '1'
            }
        } as ConfigurationInfoAnswers;
    });

    describe('showInternalQuestions', () => {
        it('should return true when all conditions are met', () => {
            const result = showInternalQuestions(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false if system is not defined', () => {
            answers.system = undefined as unknown as string;
            const result = showInternalQuestions(answers, prompter);
            expect(result).toBeFalsy();
        });

        it('should return false if isCustomerBase is true', () => {
            prompter.isCustomerBase = true;
            const result = showInternalQuestions(answers, prompter);
            expect(result).toBeFalsy();
        });
    });

    describe('showUI5VersionQuestion', () => {
        it('should return true when all conditions are met and system is onPremise', () => {
            const result = showUI5VersionQuestion(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false if system info is missing adaptation project types', () => {
            prompter.systemInfo.adaptationProjectTypes = [];
            const result = showUI5VersionQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });

        it('should return false if the project is cloud ready', () => {
            prompter.isCloudProject = true;
            const result = showUI5VersionQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });
    });

    describe('showProjectTypeQuestion', () => {
        it('should return true if system is present and authentication is not required', () => {
            const result = showProjectTypeQuestion(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false if system is undefined', () => {
            answers.system = undefined as unknown as string;
            const result = showProjectTypeQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });
    });

    describe('showApplicationQuestion', () => {
        it('should return true when all conditions are met', () => {
            const result = showApplicationQuestion(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false if system info lacks adaptation project types', () => {
            prompter.systemInfo.adaptationProjectTypes = [];
            const result = showApplicationQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });
    });

    describe('showCredentialQuestion', () => {
        it('should return true if system is defined and has authentication', () => {
            const result = showCredentialQuestion(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false if system is undefined', () => {
            answers.system = undefined as unknown as string;
            const result = showCredentialQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });
    });

    describe('showApplicationErrorQuestion', () => {
        it('should return true when conditions trigger an application error', () => {
            prompter.isApplicationSupported = false;
            prompter.flexUISystem = { isOnPremise: true, isUIFlex: true };
            const result = showApplicationErrorQuestion(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false when application is not defined', () => {
            answers.application = undefined as unknown as Application;
            const result = showApplicationErrorQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });
    });

    describe('showExtensionProjectQuestion', () => {
        it('should return true if conditions allow for an extension project', () => {
            prompter.isCloudProject = false;
            const result = showExtensionProjectQuestion(answers, prompter);
            expect(result).toBeTruthy();
        });

        it('should return false if cloud project is true', () => {
            prompter.isCloudProject = true;
            const result = showExtensionProjectQuestion(answers, prompter);
            expect(result).toBeFalsy();
        });
    });
});
