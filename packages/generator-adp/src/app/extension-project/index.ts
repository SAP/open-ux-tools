import { resolve } from 'path';

import {
    getFormattedVersion,
    type AttributesAnswers,
    type ConfigAnswers,
    type SystemLookup
} from '@sap-ux/adp-tooling';

import { t } from '../../utils/i18n';
import type { ExtensionProjectData } from '../types';

export const EXTENSIBILITY_GENERATOR_NS = '@bas-dev/generator-extensibility-sub/generators/app';
export const LEGACY_ADP_GENERATOR_NS = '@sap/generator-adaptation-project/generators/app';

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

/**
 * Resolves the path to a Yeoman generator module by its namespace.
 *
 * This utility searches through the paths specified in the `NODE_PATH` environment variable to locate the generator
 * corresponding to the provided namespace. It is designed to support dynamic generator resolution at runtime,
 * enabling tools such as `this.composeWith()` in Yeoman to invoke generators that may not be locally required,
 * but are available in a shared development environment (e.g., SAP Business Application Studio).
 *
 * This method is especially useful in scenarios where the exact generator may vary or is not bundled with the project,
 * but still expected to be available in a global or shared context (e.g., within a dev space).
 *
 * @param {string} namespace - The Yeoman generator namespace (e.g., '@bas-dev/generator-extensibility-sub/generators/app').
 * @returns {string | undefined} The absolute path to the generator module if found, or undefined if not found.
 */
export function resolveNodeModuleGenerator(namespace: string): string | undefined {
    const nodePath = process.env['NODE_PATH'];
    const nodePaths = nodePath?.split(':') ?? [];

    let generator: string | undefined;
    for (const path of nodePaths) {
        try {
            generator = require.resolve(resolve(path, namespace));
        } catch (e) {
            /**
             * We don't care if there's an error while resolving the module, continue with the next node_module path
             */
        }

        if (generator !== undefined) {
            break;
        }
    }

    return generator;
}
