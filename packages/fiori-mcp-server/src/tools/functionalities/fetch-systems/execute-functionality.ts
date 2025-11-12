import type { ExecuteFunctionalityInput, ExecuteFunctionalityOutput } from '../../../types';
import type { BackendSystem } from '@sap-ux/store';

import { SystemService } from '@sap-ux/store';
import { ToolsLogger } from '@sap-ux/logger';
import details from './details';
import { AbapServiceProvider, ODataVersion } from '@sap-ux/axios-extension';

// import { SystemLookup } from '@sap-ux/adp-tooling';

/**
 * Executes the tool's functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });
    logger.info('Getting VSCode Fiori tools SAP Systems from store...');

    const backendSystems = await new SystemService(logger).getAll({
        includeSensitiveData: true
    });
    logger.info(backendSystems);
    console.log(backendSystems);

    let output: unknown;

    // systems found - fetch services
    if (backendSystems?.length) {
        // output = backendSystems;
        logger.info('Getting ODATA V4 Services for first SAP System...');

        const firstSystem: BackendSystem | undefined = backendSystems.at(-1);
        if (firstSystem) {
            output = firstSystem;
            console.log(JSON.stringify(firstSystem));

            // const serviceProvider = new AbapServiceProvider({
            //     baseURL: firstSystem.url,
            //     auth:
            //         firstSystem.username && firstSystem.password
            //             ? {
            //                   username: firstSystem.username,
            //                   password: firstSystem.password
            //               }
            //             : undefined,
            //     params: {
            //         'sap-client': firstSystem.client
            //     }
            // });
            // const services = await serviceProvider.catalog(ODataVersion.v4).listServices();
            // // logger.info(services);
            // if (services.length > 0) {
            //     logger.info('Getting metadata for first ODATA V4 Service...');
            //     const firstService = services[0];
            //     const service = serviceProvider.service(firstService.path);
            //     const metadata = await service.metadata();
            //     logger.info(metadata);
            // }
            // output = services;
        }
    }

    if (!output || (Array.isArray(output) && output.length === 0)) {
        output = 'No systems found';
    }

    return {
        functionalityId: details.functionalityId,
        status: 'Success',
        message: 'Fetched systems successfully.',
        changes: [],
        parameters: output,
        appPath: params.appPath,
        timestamp: new Date().toISOString()
    };
}

// export default async function (params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
//     const logger = new ToolsLogger({ logPrefix: 'fiori-mcp-server' });
//     const systemName = params.parameters.system as string | undefined;
//     let output: unknown;

//     if (systemName) {
//         output = await new SystemLookup(logger).getSystemByName(systemName);
//     } else {
//         output = await new SystemService(logger).getAll({ includeSensitiveData: true });
//     }
//     if (!output || (Array.isArray(output) && output.length === 0)) {
//         output = 'No systems found';
//     }

//     return {
//         functionalityId: details.functionalityId,
//         status: 'Success',
//         message: 'Fetched systems successfully.',
//         changes: [],
//         parameters: output,
//         appPath: params.appPath,
//         timestamp: new Date().toISOString()
//     };
// }
