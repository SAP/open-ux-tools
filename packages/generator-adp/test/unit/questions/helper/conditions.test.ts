import { isAppStudio } from '@sap-ux/btp-utils';
import type { ConfigAnswers, SourceApplication, CfServicesAnswers } from '@sap-ux/adp-tooling';
import { AppRouterType } from '@sap-ux/adp-tooling';

import {
    showApplicationQuestion,
    showCredentialQuestion,
    showExtensionProjectQuestion,
    showInternalQuestions,
    showBusinessSolutionNameQuestion
} from '../../../../src/app/questions/helper/conditions';

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

const mockIsAppStudio = isAppStudio as jest.Mock;

describe('showApplicationQuestion', () => {
    it('should return true when system is provided, no authentication is required, and login is successful', () => {
        const answers = {
            system: 'TestSystem'
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true, false, true);
        expect(result).toBe(true);
    });

    it('should return false when login is unsuccessful', () => {
        const answers = {
            system: 'TestSystem',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, false, true, false);
        expect(result).toBe(false);
    });

    it('should return false if no system is provided', () => {
        const answers = {
            system: '',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, false, false, false);
        expect(result).toBe(false);
    });
});

describe('showCredentialQuestion', () => {
    it('should return true if system is provided and isAuthRequired is true', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(showCredentialQuestion(answers, true)).toBe(true);
    });

    it('should return false if system is provided but isAuthRequired is false', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(showCredentialQuestion(answers, false)).toBe(false);
    });

    it('should return false if no system is provided', () => {
        const answers = {
            system: '',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(showCredentialQuestion(answers, true)).toBe(false);
    });
});

describe('showExtensionProjectQuestion', () => {
    const answers = {
        application: { id: 'app.id', title: 'App Title' }
    } as ConfigAnswers;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return false if application is not provided', () => {
        const result = showExtensionProjectQuestion(
            { ...answers, application: undefined as unknown as SourceApplication },
            { isOnPremise: true, isUIFlex: true },
            false,
            true,
            true
        );
        expect(result).toBe(false);
    });

    it('should return false if system is cloud-based', () => {
        const result = showExtensionProjectQuestion(answers, { isOnPremise: true, isUIFlex: true }, true, true, true);
        expect(result).toBe(false);
    });

    it('should return true if onPremise AppStudio with unsupported app', () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = showExtensionProjectQuestion(
            answers,
            { isOnPremise: true, isUIFlex: true },
            false,
            false, // app not supported
            false
        );
        expect(result).toBe(true);
    });

    it('should return true if onPremise AppStudio with supported app and has sync views', () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = showExtensionProjectQuestion(
            answers,
            { isOnPremise: true, isUIFlex: true },
            false,
            true, // app supported
            true // has sync views
        );
        expect(result).toBe(true);
    });

    it('should return true if onPremise AppStudio with supported app and non-Flex system', () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = showExtensionProjectQuestion(
            answers,
            { isOnPremise: true, isUIFlex: false }, // not UIFlex
            false,
            true,
            false
        );
        expect(result).toBe(true);
    });

    it('should return false if not AppStudio even if other conditions are met', () => {
        mockIsAppStudio.mockReturnValue(false);

        const result = showExtensionProjectQuestion(answers, { isOnPremise: true, isUIFlex: true }, false, false, true);
        expect(result).toBe(false);
    });

    it('should return false if flexUISystem is undefined', () => {
        mockIsAppStudio.mockReturnValue(true);

        const result = showExtensionProjectQuestion(answers, undefined, false, true, false);
        expect(result).toBe(false);
    });
});

describe('showInternalQuestions', () => {
    it('should return true when all conditions are met', () => {
        const answers = {
            system: 'TestSystem',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showInternalQuestions(answers, false, true);
        expect(result).toBe(true);
    });

    it('should return false when application is not supported', () => {
        const answers = {
            system: 'TestSystem',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showInternalQuestions(answers, false, false);
        expect(result).toBe(false);
    });
});

describe('showBusinessSolutionNameQuestion', () => {
    it('should return true when all conditions are met', () => {
        const answers = {
            approuter: AppRouterType.MANAGED,
            businessService: 'test-service',
            businessSolutionName: '',
            baseApp: undefined
        } as CfServicesAnswers;
        const result = showBusinessSolutionNameQuestion(answers, true, true, 'test-service');
        expect(result).toBe(true);
    });

    it('should return false when businessService is undefined', () => {
        const answers = {
            approuter: AppRouterType.MANAGED,
            businessService: 'test-service',
            businessSolutionName: '',
            baseApp: undefined
        } as CfServicesAnswers;
        const result = showBusinessSolutionNameQuestion(answers, true, true, undefined);
        expect(result).toBe(false);
    });
});
