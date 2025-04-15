import { PromptState } from '../../src/prompts/prompt-state';
import type { SystemSelectionAnswers } from '../../src/app/types';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

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

    it('should set and get downloadedAppPackage correctly', () => {
        const mockBuffer = Buffer.from('mock zip content');
        PromptState.downloadedAppPackage = mockBuffer;
        expect(PromptState.downloadedAppPackage).toBe(mockBuffer);
    });

    it('should return undefined for downloadedAppPackage if not set', () => {
        expect(PromptState.downloadedAppPackage.length).toBe(0);
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