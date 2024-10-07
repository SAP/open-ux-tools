import { showManagedAppRouterQuestion } from '../src/prompts/conditions';

describe('showManagedAppRouterQuestion', () => {
    it('returns true when mtaYamlExists is false and isCapProject is false', async () => {
        const result = showManagedAppRouterQuestion(false, false);
        expect(result).toBe(true);
    });

    it('returns false when mtaYamlExists is true', async () => {
        const result = showManagedAppRouterQuestion(true, false);
        expect(result).toBe(false);
    });

    it('returns false when isCapProject is true', async () => {
        const result = showManagedAppRouterQuestion(false, true);
        expect(result).toBe(false);
    });

    it('returns false when both mtaYamlExists and isCapProject are true', async () => {
        const result = showManagedAppRouterQuestion(true, true);
        expect(result).toBe(false);
    });
});
