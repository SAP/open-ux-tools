import { validateCloudAdpProject } from '../../../src/validation/validation';
import * as adp from '@sap-ux/adp-tooling';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

jest.mock('@sap-ux/adp-tooling');

describe('validation', () => {
    describe('validateCloudAdpProject', () => {
        const descriptorVariant = JSON.parse(
            readFileSync(join(__dirname, '../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
        );
        test('throw error for omPremise project', async () => {
            jest.spyOn(adp, 'getVariant').mockReturnValue(descriptorVariant);
            try {
                await validateCloudAdpProject('');
                fail('The function should have thrown an error.');
            } catch (error) {
                expect(error.message).toBe('This command can only be used for Cloud Adaptation Project.');
            }
        });
    });
});
