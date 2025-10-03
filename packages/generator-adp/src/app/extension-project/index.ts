import {
    getFormattedVersion,
    type AttributesAnswers,
    type ConfigAnswers,
    type SystemLookup
} from '@sap-ux/adp-tooling';

import { t } from '../../utils/i18n';
import type { ExtensionProjectData } from '../types';

/**
 * Prepares data required for generating an extension project.
 *
 * @param {ConfigAnswers} configAnswers - The configuration answers including system, user, and app selection.
 * @param {AttributesAnswers} attributeAnswers - The basic project attributes like name, namespace, version.
 * @param {SystemLookup} systemLookup - The lookup service for system destination info.
 * @returns {Promise<ExtensionProjectData>} A promise resolving to the prepared extension project data object.
 */
export async function getExtensionProjectData(
    configAnswers: ConfigAnswers,
    attributeAnswers: AttributesAnswers,
    systemLookup: SystemLookup
): Promise<ExtensionProjectData> {
    const { application, system, username, password } = configAnswers;
    if (!application) {
        throw new Error(t('error.appParameterMissing'));
    }

    const destinationInfo = await systemLookup.getSystemByName(system);
    if (!destinationInfo) {
        throw new Error(t('error.destinationInfoMissing'));
    }

    const { projectName, namespace, ui5Version } = attributeAnswers;

    return {
        username,
        password,
        destination: {
            name: destinationInfo.Name,
            basUsage: destinationInfo.WebIDEUsage,
            host: destinationInfo.Host,
            sapClient: destinationInfo['sap-client']
        },
        applicationNS: namespace,
        applicationName: projectName,
        userUI5Ver: getFormattedVersion(ui5Version),
        BSPUrl: application.bspUrl,
        namespace: application.id
    };
}
