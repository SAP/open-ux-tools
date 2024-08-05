import { BasicInfoAnswers, ConfigurationInfoAnswers } from '../../../types';
import { EndpointsService, getTrimmedUI5Version } from '../../../base/services';

/**
 * Retrieves and structures the configuration necessary for setting up an extension project.
 *
 * @param {EndpointsService} endpointsService - An instance of EndpointsService used to fetch destination information.
 * @param {BasicInfoAnswers} basicAnswers - Basic user responses containing namespace and project name.
 * @param {ConfigurationInfoAnswers} configAnswers - Configuration answers that include system-specific details,
 *                                                   user credentials, and UI5 version.
 * @throws {Error} Throws an error if the necessary application parameters or destination information are missing.
 * @returns {Promise<object>} A structured object containing all necessary configurations for the external project.
 */
export async function getExtProjectConfig(
    endpointsService: EndpointsService,
    basicAnswers: BasicInfoAnswers,
    configAnswers: ConfigurationInfoAnswers
): Promise<object> {
    if (!configAnswers.application) {
        throw new Error('Application parameters are missing.');
    }

    const destinationInfo = endpointsService.getDestinationInfoByName(configAnswers.system);

    if (!destinationInfo) {
        throw new Error('Destination info is missing.');
    }

    return {
        username: configAnswers.username,
        password: configAnswers.password,
        destination: {
            name: destinationInfo.Name,
            basUsage: destinationInfo.WebIDEUsage,
            host: destinationInfo.Host,
            sapClient: destinationInfo['sap-client']
        },
        applicationNS: basicAnswers.namespace,
        applicationName: basicAnswers.projectName,
        userUI5Ver: getTrimmedUI5Version(configAnswers.ui5Version),
        BSPUrl: configAnswers.application.bspUrl,
        namespace: configAnswers.application.id
    };
}
