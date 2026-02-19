import type { ToolsLogger } from '@sap-ux/logger';

import type { MtaYaml } from '../../../../src/types';
import { getAppRouterEnvOptions } from '../../../../src/cf/project/env';
import { buildVcapServicesFromResources } from '../../../../src/cf/project/mta';

jest.mock('../../../../src/cf/project/mta', () => ({
    buildVcapServicesFromResources: jest.fn()
}));

const buildVcapServicesFromResourcesMock = buildVcapServicesFromResources as jest.MockedFunction<
    typeof buildVcapServicesFromResources
>;

describe('ENV Project Functions', () => {
    const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as ToolsLogger;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAppRouterEnvOptions', () => {
        test('returns VCAP_SERVICES from buildVcapServicesFromResources and passes through destinations', async () => {
            const mtaYaml = { resources: [{ name: 'my-xsuaa', parameters: { service: 'xsuaa' } }] } as MtaYaml;
            const spaceGuid = 'space-123';
            const destinations = [{ name: 'backend', url: 'http://localhost:8080' }];
            const vcapServices = { xsuaa: [{ label: 'xsuaa', credentials: {} }] };

            buildVcapServicesFromResourcesMock.mockResolvedValue(vcapServices);

            const result = await getAppRouterEnvOptions(mtaYaml, spaceGuid, destinations, logger);

            expect(buildVcapServicesFromResourcesMock).toHaveBeenCalledWith(mtaYaml.resources, spaceGuid, logger);
            expect(result).toEqual({
                VCAP_SERVICES: vcapServices,
                destinations
            });
        });
    });
});
