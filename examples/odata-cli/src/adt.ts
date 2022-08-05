import { createForAbap, AdtServiceConfigs, AdtServiceName } from '@sap-ux/axios-extension';

export async function getADTCatalog(env: { TEST_SYSTEM: string; TEST_USER?: string; TEST_PASSWORD?: string }) {
    const provider = createForAbap({
        baseURL: env.TEST_SYSTEM,
        ignoreCertErrors: true,
        auth: {
            username: env.TEST_USER,
            password: env.TEST_PASSWORD
        }
    });

    const serviceSchema = await provider.adt.catalog.getServiceDefinition(
        AdtServiceConfigs[AdtServiceName.TransportChecks]
    );
    console.log(serviceSchema);

    const requests = await provider.adt.getTransportRequests('', '');
    console.log(requests);
}
