import { validateEmptyString } from '@sap-ux/project-input-validator';

import { getOfficialBaseUI5VersionUrl, getFormattedVersion } from '../../../src/ui5/format';
import { validateUI5VersionExists } from '../../../src';
import { fetchMock } from '../../__mock__/global';
import { t, initI18n } from '../../../src/i18n';

jest.mock('@sap-ux/project-input-validator', () => ({
    validateEmptyString: jest.fn()
}));

jest.mock('../../../src/ui5/format', () => ({
    getOfficialBaseUI5VersionUrl: jest.fn(),
    getFormattedVersion: jest.fn()
}));

const validateEmptyStringMock = validateEmptyString as jest.Mock;
const getOfficialBaseUI5VersionUrlMock = getOfficialBaseUI5VersionUrl as jest.Mock;
const getFormattedVersionMock = getFormattedVersion as jest.Mock;

beforeAll(async () => {
    await initI18n();
});

describe('validateUI5VersionExists', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('should return error message from validateEmptyString when input is invalid', async () => {
        const errorMessage = 'Input cannot be empty';
        validateEmptyStringMock.mockReturnValue(errorMessage);

        const result = await validateUI5VersionExists('');
        expect(result).toBe(errorMessage);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return true when fetch succeeds for a non-snapshot version', async () => {
        validateEmptyStringMock.mockReturnValue(null);
        getOfficialBaseUI5VersionUrlMock.mockReturnValue('https://sapcdn.com/ui5/1.120.0');
        getFormattedVersionMock.mockReturnValue('1.120.0.min.js');

        fetchMock.mockResolvedValue({});

        const version = '1.120.0';
        const result = await validateUI5VersionExists(version);
        expect(fetchMock).toHaveBeenCalledWith('https://sapcdn.com/ui5/1.120.0/1.120.0.min.js');
        expect(result).toBe(true);
    });

    it('should return the not reachable error message for a snapshot version when fetch fails', async () => {
        validateEmptyStringMock.mockReturnValue(null);
        getOfficialBaseUI5VersionUrlMock.mockReturnValue('https://sapcdn.com/ui5/1.120.0-snapshot');

        fetchMock.mockRejectedValue(new Error('Network error'));

        const version = '1.120.0-snapshot';
        const result = await validateUI5VersionExists(version);
        expect(result).toBe(
            'The URL of the SAPUI5 version you have selected is not reachable. The https://sapcdn.com/ui5/1.120.0-snapshot URL must be made accessible through the cloud connector and the destination configuration so it can be consumed within the SAPUI5 adaptation project and its SAPUI5 Adaptation Editor.'
        );
    });

    it('should return the outdated error message when fetch fails with 400 status for non-snapshot version', async () => {
        validateEmptyStringMock.mockReturnValue(null);
        getOfficialBaseUI5VersionUrlMock.mockReturnValue('https://sapcdn.com/ui5/1.120.0');
        getFormattedVersionMock.mockReturnValue('1.120.0.min.js');

        const errorWith400 = { response: { status: 400 } };
        fetchMock.mockRejectedValue(errorWith400);

        const result = await validateUI5VersionExists('1.120.0');
        expect(result).toBe(t('validators.ui5VersionOutdatedError'));
    });

    it('should return the outdated error message when fetch fails with 404 status for non-snapshot version', async () => {
        validateEmptyStringMock.mockReturnValue(null);
        getOfficialBaseUI5VersionUrlMock.mockReturnValue('https://sapcdn.com/ui5/1.120.0');
        getFormattedVersionMock.mockReturnValue('1.120.0.min.js');

        const errorWith404 = { response: { status: 404 } };
        fetchMock.mockRejectedValue(errorWith404);

        const result = await validateUI5VersionExists('1.120.0');
        expect(result).toBe(t('validators.ui5VersionOutdatedError'));
    });

    it('should return a generic error message when fetch fails with another error status for non-snapshot version', async () => {
        validateEmptyStringMock.mockReturnValue(null);
        getOfficialBaseUI5VersionUrlMock.mockReturnValue('https://sapcdn.com/ui5/1.120.0');
        getFormattedVersionMock.mockReturnValue('1.120.0.min.js');

        const errorWith500 = { response: { status: 500 }, message: 'Server error' };
        fetchMock.mockRejectedValue(errorWith500);

        const result = await validateUI5VersionExists('1.120.0');
        expect(result).toBe(t('validators.ui5VersionDoesNotExistGeneric', { error: errorWith500.message }));
    });

    it('should return true when fetch fails with not internet connection', async () => {
        validateEmptyStringMock.mockReturnValue(null);
        getOfficialBaseUI5VersionUrlMock.mockReturnValue('https://sapcdn.com/ui5/1.120.0');
        getFormattedVersionMock.mockReturnValue('1.120.0.min.js');

        const networkError = { message: 'fetch failed' };
        fetchMock.mockRejectedValue(networkError);

        const result = await validateUI5VersionExists('1.120.0');
        expect(result).toBe(true);
    });
});
