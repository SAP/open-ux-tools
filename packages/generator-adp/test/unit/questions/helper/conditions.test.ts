import type { ConfigAnswers } from '@sap-ux/adp-tooling';

import { showApplicationQuestion, showCredentialQuestion } from '../../../../src/app/questions/helper/conditions';

describe('showApplicationQuestion', () => {
    it('should return true when system is provided, no authentication is required, and login is successful', () => {
        const answers = {
            system: 'TestSystem'
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true);
        expect(result).toBe(true);
    });

    it('should return false when login is unsuccessful', () => {
        const answers = {
            system: 'TestSystem',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, false);
        expect(result).toBe(false);
    });

    it('should return false if no system is provided', () => {
        const answers = {
            system: '',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true);
        expect(result).toBe(false);
    });
});

describe('showCredentialQuestion', () => {
    it('should return true if system is provided and isLoginSuccessful is false', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(showCredentialQuestion(answers, false)).toBe(true);
    });

    it('should return false if system is provided but isLoginSuccessful is true', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(showCredentialQuestion(answers, true)).toBe(false);
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
