import { isAppStudio } from '@sap-ux/btp-utils';

import type { DeployConfigAnswers } from '../../../../src';
import { getUI5DeployConfig, InputChoice } from '../../../../src';

const isAppStudioMock = isAppStudio as jest.Mock;

jest.mock('@sap-ux/btp-utils', () => ({
    isAppStudio: jest.fn()
}));

describe('getUI5DeployConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns undefined when not in a cloud project or not in BAS', () => {
        isAppStudioMock.mockReturnValue(false);

        const result = getUI5DeployConfig(false, {} as DeployConfigAnswers);

        expect(result).toBeUndefined();
    });

    it('returns undefined when in a cloud project but not in BAS', () => {
        isAppStudioMock.mockReturnValue(false);

        const result = getUI5DeployConfig(true, {} as DeployConfigAnswers);

        expect(result).toBeUndefined();
    });

    it('returns a deploy config when in a cloud project and in BAS', () => {
        isAppStudioMock.mockReturnValue(true);

        const answers = {
            abapRepository: 'Z_REPO',
            deployConfigDescription: 'Some description',
            packageInputChoice: InputChoice.ENTER_MANUALLY,
            packageManual: 'ManualPackage',
            transportInputChoice: InputChoice.ENTER_MANUALLY,
            transportManual: 'ManualTransport'
        };

        const result = getUI5DeployConfig(true, answers);

        expect(result).toEqual({
            name: 'Z_REPO',
            description: 'Some description',
            package: 'ManualPackage',
            transport: 'ManualTransport'
        });
    });

    it('handles autocomplete inputs for package and transport', () => {
        isAppStudioMock.mockReturnValue(true);

        const answers = {
            abapRepository: 'Z_REPO',
            deployConfigDescription: 'Some description',
            packageInputChoice: InputChoice.CHOOSE_FROM_EXISTING,
            packageAutocomplete: 'AutoPackage',
            transportInputChoice: InputChoice.CHOOSE_FROM_EXISTING,
            transportFromList: 'AutoTransport'
        };

        const result = getUI5DeployConfig(true, answers);

        expect(result).toEqual({
            name: 'Z_REPO',
            description: 'Some description',
            package: 'AutoPackage',
            transport: 'AutoTransport'
        });
    });

    it('defaults to empty string for package and transport if no value provided', () => {
        isAppStudioMock.mockReturnValue(true);

        const answers = {
            abapRepository: 'Z_REPO',
            deployConfigDescription: 'Some description',
            packageInputChoice: InputChoice.ENTER_MANUALLY,
            transportInputChoice: InputChoice.ENTER_MANUALLY
        };

        const result = getUI5DeployConfig(true, answers);

        expect(result).toEqual({
            name: 'Z_REPO',
            description: 'Some description',
            package: '',
            transport: ''
        });
    });
});
