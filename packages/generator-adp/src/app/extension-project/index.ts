import { resolve } from 'path';

import {
    getFormattedVersion,
    type AttributesAnswers,
    type ConfigAnswers,
    type SystemLookup
} from '@sap-ux/adp-tooling';

import { ExtensionProjectData } from '../types';

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
        throw new Error('Application parameters are missing.');
    }

    const destinationInfo = await systemLookup.getSystemByName(system);
    if (!destinationInfo) {
        throw new Error('Destination info is missing.');
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
 * Attempts to resolve the path to a specific node module generator from the NODE_PATH environment variable.
 * This is particularly used in the prompt for extension projects within SAP Business Application Studio (BAS)
 * when an application is not supported by the adaptation project. It functions by resolving the path to the
 * generator which is then utilized with `this.composeWith()` of the Yeoman generator. If the path to the generator
 * is found, it returns the path, allowing the extension project to continue. If no path is found, it indicates that
 * the Extensibility Generator is not installed in the development space, preventing the user from proceeding.
 *
 * @returns {string | undefined} The resolved path to the generator module if found, or undefined if not found.
 */
export function resolveNodeModuleGenerator(): string | undefined {
    const nodePath = process.env['NODE_PATH'];
    const nodePaths = nodePath?.split(':') ?? [];

    let generator: string | undefined;
    for (const path of nodePaths) {
        try {
            generator = require.resolve(resolve(path, '@bas-dev/generator-extensibility-sub/generators/app'));
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
