import { DestinationProxyType, WebIDEUsage } from '@sap-ux/btp-utils';
import type { ConnectedSystem } from '@sap-ux/odata-service-inquirer/src/types';
import type { BackendSystem } from '@sap-ux/store';
import { ApiHubType } from '../../../src/types';
import { getTelemetryBusinessHubType, getTelemetrySapSystemType } from '../../../src/utils/telemetry';

describe('Test utils', () => {
    test('getTelemetrySapSystemType - ABAP', () => {
        let sapSystemType = getTelemetrySapSystemType({
            backendSystem: {
                url: 'http:/on-prem-system:8080',
                name: 'on-prem-system'
            } as BackendSystem
        } as ConnectedSystem);
        expect(sapSystemType).toBe('ABAP');

        sapSystemType = getTelemetrySapSystemType({
            destination: {
                ProxyType: DestinationProxyType.ON_PREMISE
            }
        } as ConnectedSystem);
        expect(sapSystemType).toBe('ABAP');
    });

    test('getTelemetrySapSystemType - SCP', () => {
        let sapSystemType = getTelemetrySapSystemType({
            backendSystem: {
                url: 'http:/on-prem-system:8080',
                name: 'on-prem-system',
                serviceKeys: 'serviceKeys'
            } as BackendSystem
        } as ConnectedSystem);
        expect(sapSystemType).toBe('SCP');

        sapSystemType = getTelemetrySapSystemType({
            destination: {
                WebIDEUsage: WebIDEUsage.ABAP_CLOUD
            }
        } as ConnectedSystem);
        expect(sapSystemType).toBe('SCP');
    });

    test('getTelemetrySapSystemType - CF', () => {
        const sapSystemType = getTelemetrySapSystemType({ serviceProvider: {} } as ConnectedSystem);
        expect(sapSystemType).toBe('CF');
    });

    test('getTelemetryBusinessHubType - BusinessAcceletorHub', () => {
        const sapSystemType = getTelemetryBusinessHubType(ApiHubType.apiHub);
        expect(sapSystemType).toBe('BusinessAcceleratorHub');
    });

    test('getTelemetryBusinessHubType - BusinessHubEnterprise', () => {
        const sapSystemType = getTelemetryBusinessHubType(ApiHubType.apiHubEnterprise);
        expect(sapSystemType).toBe('BusinessHubEnterprise');
    });

    test('getTelemetryBusinessHubType - NA', () => {
        const sapSystemType = getTelemetryBusinessHubType(undefined);
        expect(sapSystemType).toBe(undefined);
    });
});
