import { jest } from '@jest/globals';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = import.meta.dirname;

jest.unstable_mockModule('@sap-ux/adp-tooling', () => ({
    getVariant: jest.fn()
}));

const adp = await import('@sap-ux/adp-tooling');
const { validateCloudAdpProject } = await import('../../../src/validation/validation');

describe('validation', () => {
    describe('validateCloudAdpProject', () => {
        test('throw error for omPremise project', async () => {
            const descriptorVariant = JSON.parse(
                readFileSync(join(__dirname, '../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
            );
            (adp.getVariant as jest.Mock).mockReturnValue(descriptorVariant);
            try {
                await validateCloudAdpProject('');
                fail('The function should have thrown an error.');
            } catch (error) {
                expect((error as Error).message).toBe('This command can only be used for Cloud Adaptation Project.');
            }
        });
    });
});
