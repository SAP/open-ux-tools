import type { ConfigAnswers } from '@sap-ux/adp-tooling';

import { showApplicationQuestion, showCredentialQuestion } from '../../../../src/app/questions/helper/conditions';

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
