import { writeFileSync } from 'fs';
import { join } from 'path';
import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import { ODataVersion, TransportChecksService, TransportRequestService } from '@sap-ux/axios-extension';
import { logger } from './types';

/**
 * Execute a sequence of test calls using the given provider.
 *
 * @param provider instance of a service provider
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_OUTPUT target directory for output
 */
export async function useCatalogAndFetchSomeMetadata(
    provider: AbapServiceProvider,
    env: {
        TEST_OUTPUT: string;
    }
): Promise<void> {
    try {
        const atoSettings = await provider.getAtoInfo();
        if (!atoSettings || Object.keys(atoSettings).length === 0) {
            console.warn('ATO setting is empty!');
        }
        // check v2 services
        const catalog = provider.catalog(ODataVersion.v2);
        const services = await catalog.listServices();
        writeFileSync(join(env.TEST_OUTPUT, 'v2-catalog.json'), JSON.stringify(services, null, 4));

        // check v4 services
        const v4Catalog = provider.catalog(ODataVersion.v4);
        const v4Services = await v4Catalog.listServices();
        writeFileSync(join(env.TEST_OUTPUT, 'v4-catalog.json'), JSON.stringify(v4Services, null, 4));

        const serviceInfo = services.find((service) => service.name.includes('SEPMRA_PROD_MAN'));

        if (serviceInfo) {
            const service = provider.service(serviceInfo.path);
            const metadata = await service.metadata();
            writeFileSync(join(env.TEST_OUTPUT, 'metadata.xml'), metadata);

            const annotations = await catalog.getAnnotations(serviceInfo);
            annotations.forEach((anno) => {
                writeFileSync(join(env.TEST_OUTPUT, `${anno.TechnicalName}.xml`), anno.Definitions);
            });
        }
    } catch (error) {
        console.error(error.cause || error.toString() || error);
    }
}

/**
 * Execute a sequence of test calls using the given provider.
 *
 * @param provider instance of a service provider
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_PACKAGE optional package name for testing fetch transport numbers
 * @param env.TEST_APP optioanl project name for testing fetch transport numbers, new project doesn't exist on backend is also allowed
 */
export async function useAdtServices(
    provider: AbapServiceProvider,
    env: {
        TEST_PACKAGE: string;
        TEST_APP: string;
    }
): Promise<void> {
    try {
        const atoSettings = await provider.getAtoInfo();
        if (!atoSettings || Object.keys(atoSettings).length === 0) {
            logger.warn('ATO setting is empty!');
        }
        const transportChecksService = await provider.getAdtService<TransportChecksService>(TransportChecksService);
        const transportRequestList = await transportChecksService.getTransportRequests(env.TEST_PACKAGE, env.TEST_APP);
        if (transportRequestList.length === 0) {
            logger.info(`Transport number is empty for package name ${env.TEST_PACKAGE}, app name ${env.TEST_APP}`);
        } else {
            logger.info(JSON.stringify(transportRequestList));
        }

        const trasnportRequestService = await provider.getAdtService<TransportRequestService>(TransportRequestService);
        const newTransportNumber = await trasnportRequestService.createTransportRequest({
            packageName: env.TEST_PACKAGE,
            ui5AppName: env.TEST_APP,
            description: 'Test from odata-cli'
        });
        logger.info(`Created transport number: ${newTransportNumber}`);
    } catch (error) {
        logger.error(error.cause || error.toString() || error);
    }
}

/**
 * Execute a sequence of check, deploy and undeploy requests for a DTA project.
 *
 * @param provider instance of a service provider
 * @param env object reprensenting the content of the .env file.
 * @param env.TEST_ZIP path to a zipped webapp folder of an adaptation project that should be deployed
 * @param env.TEST_NAMESPACE namespaces containing the referenced app as well as the new project id
 * @param env.TEST_PACKAGE optional package name
 * @param env.TEST_TRANSPORT optional transport id
 */
export async function testDeployUndeployDTA(
    provider: AbapServiceProvider,
    env: {
        TEST_ZIP: string;
        TEST_NAMESPACE: string;
        TEST_PACKAGE?: string;
        TEST_TRANSPORT?: string;
    }
): Promise<void> {
    const service = provider.getLayeredRepository();
    try {
        let response = await service.isExistingVariant(env.TEST_NAMESPACE);
        logger.info(`isExistingVariant: ${response.status}`);

        response = await service.deploy(env.TEST_ZIP, {
            namespace: env.TEST_NAMESPACE,
            'package': env.TEST_PACKAGE,
            transport: env.TEST_TRANSPORT
        });
        logger.info(response.request.url);
        logger.info(`deploy: ${response.status}`);

        if (response.status === 200) {
            response = await service.isExistingVariant(env.TEST_NAMESPACE);
            logger.info(`isExistingVariant: ${response.status}`);

            response = await service.undeploy({
                namespace: env.TEST_NAMESPACE,
                'package': env.TEST_PACKAGE,
                transport: env.TEST_TRANSPORT
            });
            logger.info(`undeploy: ${response.status}`);
        }
    } catch (error) {
        logger.error(`Error: ${error.message}`);
    }
}
