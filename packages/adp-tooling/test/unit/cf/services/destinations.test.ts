import { jest } from '@jest/globals';
import { join, dirname } from 'node:path';

// Create mocks before any imports
const mockGetOrCreateServiceInstanceKeys = jest.fn();
const mockListBtpDestinations = jest.fn();
const mockGetYamlContent = jest.fn();

jest.unstable_mockModule('@sap-ux/btp-utils', () => ({}));

jest.unstable_mockModule('../../../../src/cf/services/api', () => ({
    getOrCreateServiceInstanceKeys: mockGetOrCreateServiceInstanceKeys
}));

jest.unstable_mockModule('../../../../src/btp/api', () => ({
    listBtpDestinations: mockListBtpDestinations
}));

jest.unstable_mockModule('../../../../src/cf/project/yaml-loader', () => ({
    getYamlContent: mockGetYamlContent
}));

const { getBtpDestinations } = await import('../../../../src/cf/services/destinations');
const { initI18n, t } = await import('../../../../src/i18n');

const mockProjectPath = join('path', 'to', 'project');

const mockMtaYaml = {
    ID: 'test-project',
    '_schema-version': '3.3.0',
    version: '0.0.1',
    resources: [
        {
            name: 'test-project-destination',
            type: 'org.cloudfoundry.managed-service',
            parameters: { service: 'destination', 'service-plan': 'lite' }
        },
        {
            name: 'test-project-uaa',
            type: 'org.cloudfoundry.managed-service',
            parameters: { service: 'xsuaa', 'service-plan': 'application' }
        }
    ]
};

const mockDestinations = {
    MY_DEST: {
        Name: 'MY_DEST',
        Host: 'https://dest.example.com',
        Type: 'HTTP',
        Authentication: 'NoAuthentication',
        ProxyType: 'Internet',
        Description: 'My destination'
    }
};

const mockCredentials = {
    uri: 'https://destination.cfapps.example.com',
    uaa: { clientid: 'client-id', clientsecret: 'client-secret', url: 'https://auth.example.com' }
};

const mockServiceInfo = {
    serviceKeys: [{ credentials: mockCredentials }],
    serviceInstance: { name: 'test-project-destination', guid: 'some-guid' }
};

describe('getBtpDestinations', () => {
    beforeAll(async () => {
        await initI18n();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch destinations from the logged-in CF subaccount using service keys', async () => {
        mockGetYamlContent.mockReturnValue(mockMtaYaml);
        mockGetOrCreateServiceInstanceKeys.mockResolvedValue(mockServiceInfo);
        mockListBtpDestinations.mockResolvedValue(mockDestinations);

        const result = await getBtpDestinations(mockProjectPath);

        expect(mockGetYamlContent).toHaveBeenCalledWith(join(dirname(mockProjectPath), 'mta.yaml'));
        expect(mockGetOrCreateServiceInstanceKeys).toHaveBeenCalledWith({ names: ['test-project-destination'] });
        expect(mockListBtpDestinations).toHaveBeenCalledWith(mockCredentials);
        expect(result).toBe(mockDestinations);
    });

    it('should throw an error when no destination service is found in mta.yaml', async () => {
        mockGetYamlContent.mockReturnValue({
            ...mockMtaYaml,
            resources: [
                {
                    name: 'test-project-uaa',
                    type: 'org.cloudfoundry.managed-service',
                    parameters: { service: 'xsuaa', 'service-plan': 'application' }
                }
            ]
        });

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow(
            t('error.destinationServiceNotFoundInMtaYaml')
        );

        expect(mockGetOrCreateServiceInstanceKeys).not.toHaveBeenCalled();
    });

    it('should throw an error when mta.yaml cannot be read', async () => {
        mockGetYamlContent.mockImplementation(() => {
            throw new Error('File not found');
        });

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow('File not found');

        expect(mockGetOrCreateServiceInstanceKeys).not.toHaveBeenCalled();
    });

    it('should throw an error when no service keys are available', async () => {
        mockGetYamlContent.mockReturnValue(mockMtaYaml);
        mockGetOrCreateServiceInstanceKeys.mockResolvedValue({
            serviceKeys: [],
            serviceInstance: { name: 'test-project-destination', guid: 'some-guid' }
        });

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow(
            t('error.noServiceKeysFoundForDestination', { serviceInstanceName: 'test-project-destination' })
        );

        expect(mockListBtpDestinations).not.toHaveBeenCalled();
    });

    it('should throw an error when getOrCreateServiceInstanceKeys does not return any keys', async () => {
        mockGetYamlContent.mockReturnValue(mockMtaYaml);
        mockGetOrCreateServiceInstanceKeys.mockResolvedValue(null);

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow(
            t('error.noServiceKeysFoundForDestination', { serviceInstanceName: 'test-project-destination' })
        );

        expect(mockListBtpDestinations).not.toHaveBeenCalled();
    });
});
