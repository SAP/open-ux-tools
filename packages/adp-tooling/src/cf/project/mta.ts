import * as path from 'path';

import type { ToolsLogger } from '@sap-ux/logger';

import { requestCfApi } from '../services/api';
import { getRouterType } from './yaml';
import { getYamlContent } from './yaml-loader';
import type { CfServiceOffering, CfAPIResponse, BusinessServiceResource, Resource, AppRouterType } from '../../types';

/**
 * Get the approuter type.
 *
 * @param {string} mtaProjectPath - The path to the mta project.
 * @returns {AppRouterType} The approuter type.
 */
export function getApprouterType(mtaProjectPath: string): AppRouterType {
    const yamlContent = getYamlContent(path.join(mtaProjectPath, 'mta.yaml'));
    return getRouterType(yamlContent);
}

/**
 * Get the module names.
 *
 * @param {string} mtaProjectPath - The path to the mta project.
 * @returns {string[]} The module names.
 */
export function getModuleNames(mtaProjectPath: string): string[] {
    const yamlContent = getYamlContent(path.join(mtaProjectPath, 'mta.yaml'));
    return yamlContent?.modules?.map((module: { name: string }) => module.name) ?? [];
}

/**
 * Get the services for the file.
 *
 * @param {string} mtaFilePath - The path to the mta file.
 * @param {ToolsLogger} logger - The logger.
 * @returns {BusinessServiceResource[]} The services.
 */
export function getServicesForFile(mtaFilePath: string, logger: ToolsLogger): BusinessServiceResource[] {
    const serviceNames: BusinessServiceResource[] = [];
    const parsed = getYamlContent(mtaFilePath);
    if (parsed?.resources && Array.isArray(parsed.resources)) {
        parsed.resources.forEach((resource: Resource) => {
            const name = resource?.parameters?.['service-name'] || resource.name;
            const label = resource?.parameters?.service as string;
            if (name) {
                serviceNames.push({ name, label });
                if (!label) {
                    logger?.log(`Service '${name}' will be ignored without 'service' parameter`);
                }
            }
        });
    }
    return serviceNames;
}

/**
 * Check if the project has an approuter.
 *
 * @param {string} projectName - The project name.
 * @param {string[]} moduleNames - The module names.
 * @returns {boolean} Whether the project has an approuter.
 */
export function hasApprouter(projectName: string, moduleNames: string[]): boolean {
    return moduleNames.some(
        (name) =>
            name === `${projectName.toLowerCase()}-destination-content` ||
            name === `${projectName.toLowerCase()}-approuter`
    );
}

/**
 * Filter services based on the business services.
 *
 * @param {BusinessServiceResource[]} businessServices - The business services.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} The filtered services.
 */
async function filterServices(businessServices: BusinessServiceResource[], logger: ToolsLogger): Promise<string[]> {
    const serviceLabels = businessServices.map((service) => service.label).filter((label) => label);
    if (serviceLabels.length > 0) {
        const url = `/v3/service_offerings?names=${serviceLabels.join(',')}`;
        const json = await requestCfApi<CfAPIResponse<CfServiceOffering>>(url);
        logger?.log(`Filtering services. Request to: ${url}, result: ${JSON.stringify(json)}`);

        const businessServiceNames = new Set(businessServices.map((service) => service.label));
        const result: string[] = [];
        json?.resources?.forEach((resource: CfServiceOffering) => {
            if (businessServiceNames.has(resource.name)) {
                const sapService = resource?.['broker_catalog']?.metadata?.sapservice;
                if (sapService && ['v2', 'v4'].includes(sapService?.odataversion ?? '')) {
                    result.push(businessServices?.find((service) => resource.name === service.label)?.name ?? '');
                } else {
                    logger?.log(`Service '${resource.name}' doesn't support V2/V4 Odata and will be ignored`);
                }
            }
        });

        if (result.length > 0) {
            return result;
        }
    }
    throw new Error(`No business services found, please specify the business services in resource section of mts.yaml:
    - name: <arbitrary name of resource, e.g. my_service>
        type: org.cloudfoundry.<managed|existing>-service
        parameters:
        service: <business service name, e.g. my-service-name>
        service-name: <business service instance name, e.g. my_service_instance_name>
        service-plan: <plan name, e.g. standard>`);
}

/**
 * Get the services for the MTA project.
 *
 * @param {string} projectPath - The path to the project.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} The services.
 */
export async function getMtaServices(projectPath: string, logger: ToolsLogger): Promise<string[]> {
    const services = await readMta(projectPath, logger);
    logger?.log(`Available services defined in mta.yaml: ${JSON.stringify(services)}`);
    return services;
}

/**
 * Get the resources for the MTA file.
 *
 * @param {string} mtaFilePath - The path to the mta file.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} The resources.
 */
export async function getResources(mtaFilePath: string, logger: ToolsLogger): Promise<string[]> {
    const servicesList = getServicesForFile(mtaFilePath, logger);
    const oDataFilteredServices = await filterServices(servicesList, logger);
    return oDataFilteredServices;
}

/**
 * Read the MTA file.
 *
 * @param {string} projectPath - The path to the project.
 * @param {ToolsLogger} logger - The logger.
 * @returns {Promise<string[]>} The resources.
 */
export async function readMta(projectPath: string, logger: ToolsLogger): Promise<string[]> {
    if (!projectPath) {
        throw new Error('Project path is missing.');
    }

    const mtaFilePath = path.resolve(projectPath, 'mta.yaml');
    const resources = await getResources(mtaFilePath, logger);
    return resources;
}
