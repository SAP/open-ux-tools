import { TransportChecksService } from '@sap-ux/axios-extension';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';

export async function listTransports(
    packageName: string,
    repository: string,
    provider: AbapServiceProvider
): Promise<string[] | undefined> {
    const transportCheckService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
    const transportRequests = await transportCheckService?.getTransportRequests(packageName, repository);
    return transportRequests?.map((transport) => transport.transportNumber);
}
