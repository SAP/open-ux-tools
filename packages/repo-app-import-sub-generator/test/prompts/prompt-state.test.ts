import { PromptState } from '../../src/prompts/prompt-state';
import type { SystemSelectionAnswers } from '../../src/app/types';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import AdmZip from 'adm-zip';

jest.mock('adm-zip');
describe('PromptState', () => {
    const mockServiceProvider = {
        defaults: {
            baseURL: 'https://mock.sap-system.com',
            params: {
                'sap-client': '100'
            }
        }
    } as unknown as AbapServiceProvider;
    let mockSystemSelection: SystemSelectionAnswers;
    beforeEach(() => {
        mockSystemSelection = {
            connectedSystem: {
                serviceProvider: mockServiceProvider
            }
        }
    });

    afterEach(() => {
        PromptState.reset();
    });

    it('should set the state of systemSelection', () => {
        PromptState.systemSelection = mockSystemSelection;
        expect(PromptState.systemSelection).toEqual(mockSystemSelection);
    });

    it('should reset systemSelection to an empty object', () => {
        PromptState.systemSelection = mockSystemSelection;
        expect(PromptState.systemSelection).toEqual(mockSystemSelection);

        PromptState.reset();
        expect(PromptState.systemSelection).toEqual({});
    });

    it('should set and get the AdmZip instance correctly', () => {
        const mockBuffer = Buffer.from('mock-zip-content');

        PromptState.admZip = mockBuffer;
        const admZipInstance = PromptState.admZip;
        expect(admZipInstance).toBeDefined();
        expect(admZipInstance).toBeInstanceOf(AdmZip);
    });

    it('should return undefined if admZip is not set', () => {
        const admZipInstance = PromptState.admZip;
        expect(admZipInstance).toBeUndefined();
    });

    it('should return baseURL from connected system', () => {
        PromptState.systemSelection = mockSystemSelection;
        expect(PromptState.baseURL).toBe('https://mock.sap-system.com');
    });

    it('should return sapClient from connected system', () => {
        PromptState.systemSelection = mockSystemSelection;
        expect(PromptState.sapClient).toBe('100');
    });
});