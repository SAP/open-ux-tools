import type { ConfigAnswers } from '@sap-ux/adp-tooling';

import {
    shouldAuthenticate,
    showApplicationQuestion,
    showCredentialQuestion
} from '../../../../src/app/questions/helper/conditions';

describe('shouldAuthenticate', () => {
    it('should return false if no system is provided', () => {
        const answers = {
            system: '',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(shouldAuthenticate(answers, true)).toBe(false);
    });

    it('should return false if systemRequiresAuth is false', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(shouldAuthenticate(answers, false)).toBe(false);
    });

    it('should return true if system provided, systemRequiresAuth is true, and username is empty', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(shouldAuthenticate(answers, true)).toBe(true);
    });

    it('should return true if system provided, systemRequiresAuth is true, and password is empty', () => {
        const answers = {
            system: 'TestSystem',
            username: 'user',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(shouldAuthenticate(answers, true)).toBe(true);
    });

    it('should return false if both username and password are provided', () => {
        const answers = {
            system: 'TestSystem',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(shouldAuthenticate(answers, true)).toBe(false);
    });
});

describe('showApplicationQuestion', () => {
    it('should return true when system is provided, no authentication is required, and login is successful', () => {
        // With credentials provided, shouldAuthenticate returns false.
        const answers = {
            system: 'TestSystem',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true, true);
        expect(result).toBe(true);
    });

    it('should return false when authentication is required (i.e. missing credentials)', () => {
        // Missing credentials cause shouldAuthenticate to return true.
        const answers = {
            system: 'TestSystem',
            username: '',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true, true);
        expect(result).toBe(false);
    });

    it('should return false when login is unsuccessful', () => {
        const answers = {
            system: 'TestSystem',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true, false);
        expect(result).toBe(false);
    });

    it('should return false if no system is provided', () => {
        const answers = {
            system: '',
            username: 'user',
            password: 'pass',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        const result = showApplicationQuestion(answers, true, true);
        expect(result).toBe(false);
    });
});

describe('showCredentialQuestion', () => {
    it('should return true if system is provided and systemRequiresAuth is true', () => {
        const answers = {
            system: 'TestSystem',
            username: '',
            password: '',
            application: { id: '1', title: 'Test App' }
        } as ConfigAnswers;
        expect(showCredentialQuestion(answers, true)).toBe(true);
    });

    it('should return false if system is provided but systemRequiresAuth is false', () => {
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
