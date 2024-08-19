import { getTrimmedUI5Version, getExtProjectConfig } from '../../../../../src';
import type { Application, BasicInfoAnswers, ConfigurationInfoAnswers, EndpointsManager } from '../../../../../src';

jest.mock('../../../../../src/base/services/ui5-version-service.ts', () => ({
    getTrimmedUI5Version: jest.fn()
}));

const getTrimmedUI5VersionMock = getTrimmedUI5Version as jest.Mock;

describe('getExtProjectConfig', () => {
    const getDestinationInfoByNameMock = jest.fn();

    const endpointsManager = {
        getDestinationInfoByName: getDestinationInfoByNameMock
    } as unknown as EndpointsManager;

    const basicAnswers = {
        namespace: 'my.namespace',
        projectName: 'MyProject'
    } as BasicInfoAnswers;

    const configAnswers = {
        username: 'username',
        password: 'password',
        system: 'TestSystem',
        ui5Version: '1.127.0',
        application: {
            id: 'appId',
            bspUrl: 'http://example.com'
        }
    } as ConfigurationInfoAnswers;

    beforeEach(() => {
        jest.clearAllMocks();
        getDestinationInfoByNameMock.mockReset();
        getTrimmedUI5VersionMock.mockReturnValue('1.127.0');
    });

    it('throws an error if application parameters are missing', () => {
        const configAnswersMissingApp = { ...configAnswers, application: undefined as unknown as Application };

        expect(() => getExtProjectConfig(endpointsManager, basicAnswers, configAnswersMissingApp)).toThrow(
            'Application parameters are missing.'
        );
    });

    it('throws an error if destination information is missing', () => {
        getDestinationInfoByNameMock.mockReturnValue(undefined);

        expect(() => getExtProjectConfig(endpointsManager, basicAnswers, configAnswers)).toThrow(
            'Destination info is missing.'
        );
    });

    it('returns a structured configuration object when all conditions are met', () => {
        const destinationInfo = {
            Name: 'U1Y_100',
            WebIDEUsage: 'odata_abap',
            Host: 'testhost.example.com',
            'sap-client': '100'
        };
        getDestinationInfoByNameMock.mockReturnValue(destinationInfo);

        const result = getExtProjectConfig(endpointsManager, basicAnswers, configAnswers);

        expect(result).toEqual({
            username: configAnswers.username,
            password: configAnswers.password,
            destination: {
                name: 'U1Y_100',
                basUsage: 'odata_abap',
                host: 'testhost.example.com',
                sapClient: '100'
            },
            applicationNS: basicAnswers.namespace,
            applicationName: basicAnswers.projectName,
            userUI5Ver: '1.127.0',
            BSPUrl: 'http://example.com',
            namespace: 'appId'
        });
    });
});
