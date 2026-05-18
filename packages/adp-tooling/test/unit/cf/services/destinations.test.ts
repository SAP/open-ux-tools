import { join, dirname } from 'node:path';
import { getBtpDestinations } from '../../../../src/cf/services/destinations';
import { getOrCreateServiceInstanceKeys } from '../../../../src/cf/services/api';
import { listBtpDestinations } from '../../../../src/btp/api';
import { getYamlContent } from '../../../../src/cf/project/yaml-loader';
import { initI18n, t } from '../../../../src/i18n';

jest.mock('@sap-ux/btp-utils');

jest.mock('../../../../src/cf/services/api', () => ({
    getOrCreateServiceInstanceKeys: jest.fn()
}));

jest.mock('../../../../src/btp/api', () => ({
    listBtpDestinations: jest.fn()
}));

jest.mock('../../../../src/cf/project/yaml-loader', () => ({
    getYamlContent: jest.fn()
}));

const getOrCreateServiceInstanceKeysMock = getOrCreateServiceInstanceKeys as jest.Mock;
const listBtpDestinationsMock = listBtpDestinations as jest.Mock;
const getYamlContentMock = getYamlContent as jest.Mock;

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
        getYamlContentMock.mockReturnValue(mockMtaYaml);
        getOrCreateServiceInstanceKeysMock.mockResolvedValue(mockServiceInfo);
        listBtpDestinationsMock.mockResolvedValue(mockDestinations);

        const result = await getBtpDestinations(mockProjectPath);

        expect(getYamlContentMock).toHaveBeenCalledWith(join(dirname(mockProjectPath), 'mta.yaml'));
        expect(getOrCreateServiceInstanceKeysMock).toHaveBeenCalledWith({ names: ['test-project-destination'] });
        expect(listBtpDestinationsMock).toHaveBeenCalledWith(mockCredentials);
        expect(result).toBe(mockDestinations);
    });

    it('should throw an error when no destination service is found in mta.yaml', async () => {
        getYamlContentMock.mockReturnValue({
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

        expect(getOrCreateServiceInstanceKeysMock).not.toHaveBeenCalled();
    });

    it('should throw an error when mta.yaml cannot be read', async () => {
        getYamlContentMock.mockImplementation(() => {
            throw new Error('File not found');
        });

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow('File not found');

        expect(getOrCreateServiceInstanceKeysMock).not.toHaveBeenCalled();
    });

    it('should throw an error when no service keys are available', async () => {
        getYamlContentMock.mockReturnValue(mockMtaYaml);
        getOrCreateServiceInstanceKeysMock.mockResolvedValue({
            serviceKeys: [],
            serviceInstance: { name: 'test-project-destination', guid: 'some-guid' }
        });

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow(
            t('error.noServiceKeysFoundForDestination', { serviceInstanceName: 'test-project-destination' })
        );

        expect(listBtpDestinationsMock).not.toHaveBeenCalled();
    });

    it('should throw an error when getOrCreateServiceInstanceKeys does not return any keys', async () => {
        getYamlContentMock.mockReturnValue(mockMtaYaml);
        getOrCreateServiceInstanceKeysMock.mockResolvedValue(null);

        await expect(getBtpDestinations(mockProjectPath)).rejects.toThrow(
            t('error.noServiceKeysFoundForDestination', { serviceInstanceName: 'test-project-destination' })
        );

        expect(listBtpDestinationsMock).not.toHaveBeenCalled();
    });
});
