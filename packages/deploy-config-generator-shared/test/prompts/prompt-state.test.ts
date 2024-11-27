import { PromptState } from '../../src/prompts';
import type { AbapDeployConfigAnswersInternal, TransportAnswers } from '../../src/types';
import { PackageInputChoices } from '../../src/types';

describe('PromptState', () => {
    beforeEach(() => {
        PromptState.abapDeployConfig = {};
        PromptState.transportAnswers = { transportRequired: true };
        PromptState.isYUI = false;
    });

    describe('abapDeployConfig', () => {
        it('should return the default empty state initially', () => {
            expect(PromptState.abapDeployConfig).toEqual({});
        });

        it('should set and get the abapDeployConfig state correctly', () => {
            const config: Partial<AbapDeployConfigAnswersInternal> = {
                package: 'my-package',
                description: 'Test description',
                username: 'test-user',
                packageInputChoice: PackageInputChoices.EnterManualChoice
            };

            PromptState.abapDeployConfig = config;
            expect(PromptState.abapDeployConfig).toEqual(config);
        });

        it('should reset the abapDeployConfig state correctly', () => {
            PromptState.abapDeployConfig = {
                package: 'test-package',
                description: 'Another test description'
            };

            PromptState.resetAbapDeployConfig();
            expect(PromptState.abapDeployConfig).toEqual({});
        });
    });

    describe('transportAnswers', () => {
        it('should return the default transportAnswers state initially', () => {
            expect(PromptState.transportAnswers).toEqual({ transportRequired: true });
        });

        it('should set and get the transportAnswers state correctly', () => {
            const answers: TransportAnswers = {
                transportRequired: false,
                newTransportNumber: '123456',
                transportConfigError: 'No errors',
                transportList: [{ transportReqNumber: 'TR1234', transportReqDescription: 'Test transport' }]
            };

            PromptState.transportAnswers = answers;
            expect(PromptState.transportAnswers).toEqual(answers);
        });

        it('should reset the transportAnswers state correctly', () => {
            PromptState.transportAnswers = {
                transportRequired: false,
                transportConfig: { description: 'Transport config details' } as any,
                transportList: [{ transportNumber: 'TR1234', description: 'Transport 1' }] as any
            };

            PromptState.resetTransportAnswers();
            expect(PromptState.transportAnswers).toEqual({});
        });
    });

    describe('isYUI', () => {
        it('should return the default value of false', () => {
            expect(PromptState.isYUI).toBe(false);
        });

        it('should allow updating the value of isYUI', () => {
            PromptState.isYUI = true;
            expect(PromptState.isYUI).toBe(true);
        });
    });
});
