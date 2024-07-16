import { validateAdpProject } from '../../../src/validation/validation';
import * as projectAccess from '@sap-ux/project-access';
import * as adp from '@sap-ux/adp-tooling';
import { join } from 'path';
import { readFileSync } from 'fs';

jest.mock('@sap-ux/adp-tooling');

describe('validation', () => {
    describe('validateAdpProject', () => {
        test('validateAdpProject - not adaptation project', async () => {
            jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('SAP Fiori elements');
            await expect(validateAdpProject('')).rejects.toThrow(
                'This command can only be used for an adaptation project'
            );
        });

        test('validateAdpProject - CF environment', async () => {
            jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
            jest.spyOn(adp, 'isCFEnvironment').mockReturnValue(true);
            await expect(validateAdpProject('')).rejects.toThrow('This command is not supported for CF projects.');
        });

        test('validateAdpProject - not cloud project', async () => {
            const descriptorVariant = JSON.parse(
                readFileSync(join(__dirname, '../../fixtures/adaptation-project', 'manifest.appdescr_variant'), 'utf-8')
            );
            jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
            jest.spyOn(adp, 'isCFEnvironment').mockReturnValue(false);
            jest.spyOn(adp, 'getVariant').mockReturnValue(descriptorVariant);
            await expect(validateAdpProject('', true)).rejects.toThrow(
                'This command can only be used for Cloud Adaptation Project'
            );
        });
    });
});
