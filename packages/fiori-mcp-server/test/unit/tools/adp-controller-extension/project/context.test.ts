import { jest } from '@jest/globals';

const mockGetVariant = jest.fn<any>();
jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    getVariant: mockGetVariant
}));

const { loadProjectContext } = await import('../../../../../src/tools/adp-controller-extension/project/context.js');

describe('loadProjectContext', () => {
    afterEach(() => {
        mockGetVariant.mockReset();
    });

    test('returns context when variant has layer and id', async () => {
        mockGetVariant.mockResolvedValue({ layer: 'CUSTOMER_BASE', id: 'customer.adapt.demo' });
        const result = await loadProjectContext('/app/my-variant');
        expect('context' in result).toBe(true);
        if ('context' in result) {
            expect(result.context.layer).toBe('CUSTOMER_BASE');
            expect(result.context.variantId).toBe('customer.adapt.demo');
            expect(result.context.projectFolderName).toBe('my-variant');
        }
    });

    test('falls back to empty strings when layer and id are undefined', async () => {
        // Covers the `??` branches: variant.layer ?? '' and variant.id ?? ''
        mockGetVariant.mockResolvedValue({ layer: undefined, id: undefined });
        const result = await loadProjectContext('/app/no-meta');
        expect('context' in result).toBe(true);
        if ('context' in result) {
            expect(result.context.layer).toBe('');
            expect(result.context.variantId).toBe('');
        }
    });

    test('returns error envelope when getVariant throws', async () => {
        mockGetVariant.mockRejectedValue(new Error('manifest not found'));
        const result = await loadProjectContext('/app/bad');
        expect('error' in result).toBe(true);
        if ('error' in result) {
            expect(result.error.status).toBe('Error');
            expect(result.error.message).toContain('manifest not found');
        }
    });
});
