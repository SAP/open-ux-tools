import { PromptState } from '../../src/prompts/prompt-state';
import type { SystemSelectionAnswers } from '../../src/app/types';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

describe('PromptState', () => {

    const mockServiceProvider = {
        getAppIndex: jest.fn().mockReturnValue({
            search: jest.fn().mockResolvedValue([{ id: 'app1' }, { id: 'app2' }])
        })
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
});