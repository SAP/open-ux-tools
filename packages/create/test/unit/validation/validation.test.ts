import { validateAdpProject } from '../../../src/validation/validation';
import * as projectAccess from '@sap-ux/project-access';
import * as adp from '@sap-ux/adp-tooling';

jest.mock('@sap-ux/adp-tooling');

describe('validation', () => {
    describe('validateAdpProject', () => {
        test('validateAdpProject - not Adaptation Project', async () => {
            jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('SAP Fiori elements');
            await expect(validateAdpProject('')).rejects.toThrow(
                'This command can only be used for an Adaptation Project'
            );
        });

        test('validateAdpProject - CF environment', async () => {
            jest.spyOn(projectAccess, 'getAppType').mockResolvedValue('Fiori Adaptation');
            jest.spyOn(adp, 'isCFEnvironment').mockReturnValue(true);
            await expect(validateAdpProject('')).rejects.toThrow('This command is not supported for CF projects.');
        });
    });
});
