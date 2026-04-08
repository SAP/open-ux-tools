import type { Destination } from '@sap-ux/btp-utils';
import { isGenericODataDestination, isAbapEnvironmentOnBtp } from '@sap-ux/btp-utils';
import { DefaultMTADestination, SRV_API, MTAAPIDestination } from '../constants';
import { type MTADestinationType, type ModuleType } from '../types';
import type { MtaContext } from './mta-context';

/**
 * Manages destination configuration within MTA resources and modules.
 * All methods are package-private — only MtaDeployment instantiates this class.
 */
export class DestinationManager {
    constructor(private readonly ctx: MtaContext) {}

    /**
     * Add a destination to the appropriate router based on router type.
     * Dispatches to AppFront inline config or instance-based destination.
     *
     * @param cfDestination
     */
    async addDestinationToAppRouter(cfDestination: string | undefined): Promise<void> {
        if (this.ctx.modules.has('com.sap.application.content:appfront')) {
            await this.appendAppfrontCAPDestination(cfDestination);
        } else {
            await this.appendInstanceBasedDestination(cfDestination);
        }
    }

    /**
     * Get exposed destination names from both resources and modules.
     *
     * @param checkWebIDEUsage If true, only return OData destinations
     */
    getExposedDestinations(checkWebIDEUsage = false): string[] {
        const exposedDestinations: string[] = [];
        const destinationResources = this.ctx.resources.get('destination');
        if (destinationResources) {
            destinationResources.parameters?.config?.init_data?.instance?.destinations?.forEach(
                (dest: Destination) =>
                    (checkWebIDEUsage ? this.isODataDestination(dest) : true) && exposedDestinations.push(dest.Name)
            );
            destinationResources.parameters?.config?.init_data?.subaccount?.destinations?.forEach(
                (dest: Destination) =>
                    (checkWebIDEUsage ? this.isODataDestination(dest) : true) && exposedDestinations.push(dest.Name)
            );
        }
        const destinationModules = this.ctx.modules.get('com.sap.application.content:destination');
        if (destinationModules) {
            destinationModules.parameters?.content?.instance?.destinations?.map(
                (dest: Destination) =>
                    (checkWebIDEUsage ? this.isODataDestination(dest) : true) && exposedDestinations.push(dest.Name)
            );
        }
        return exposedDestinations;
    }

    private async appendAppfrontCAPDestination(cfDestination: string | undefined): Promise<void> {
        const module = this.ctx.modules.get('com.sap.application.content:appfront');
        if (module) {
            const destName = cfDestination === DefaultMTADestination ? SRV_API : cfDestination;
            if (
                !module.parameters?.config?.destinations?.some(
                    (destination: MTADestinationType) => destination.Name === destName
                )
            ) {
                module.parameters?.config?.destinations.push({ Name: destName });
                await this.ctx.mta.updateModule(module);
            }
        }
    }

    private async appendInstanceBasedDestination(cfDestination: string | undefined): Promise<void> {
        const destinationResource = this.ctx.resources.get('destination');
        const capDestName = cfDestination === DefaultMTADestination ? SRV_API : cfDestination;
        if (destinationResource) {
            if (!destinationResource.requires?.some((ele) => ele.name === SRV_API)) {
                destinationResource.requires = [...(destinationResource.requires ?? []), { name: SRV_API }];
            }
            const isSrvApiExisting =
                cfDestination === SRV_API &&
                destinationResource.parameters?.config?.init_data?.instance?.destinations?.some(
                    (destination: MTADestinationType) => destination.Name === SRV_API
                );
            if (!isSrvApiExisting) {
                if (
                    !destinationResource.parameters?.config?.init_data?.instance?.destinations?.some(
                        (destination: MTADestinationType) => destination.Name === capDestName
                    )
                ) {
                    destinationResource.parameters?.config?.init_data?.instance?.destinations?.push({
                        ...MTAAPIDestination,
                        Name: capDestName
                    });
                }
            }
            await this.ctx.mta.updateResource(destinationResource);
            this.ctx.resources.set('destination', destinationResource);
            await this.updateServerModuleForDestination();
            this.ctx.dirty = true;
        }
    }

    private async updateServerModuleForDestination(): Promise<void> {
        const moduleType: ModuleType = this.ctx.modules.has('nodejs') ? 'nodejs' : 'java';
        const serverModule = this.ctx.modules.get(moduleType);
        if (serverModule) {
            const { ServiceAPIRequires } = await import('../constants');
            if (!serverModule.provides?.some((ele) => ele.name === SRV_API)) {
                serverModule.provides = [...(serverModule.provides ?? []), ...[ServiceAPIRequires]];
            }
            const mtaResource = this.ctx.resources.get('managed:xsuaa');
            if (mtaResource && !serverModule.requires?.some((ele) => ele.name === mtaResource.name)) {
                serverModule.requires = [...(serverModule.requires ?? []), { name: mtaResource.name }];
            }
            await this.ctx.mta.updateModule(serverModule);
            this.ctx.modules.set(moduleType, serverModule);
            this.ctx.dirty = true;
        }
    }

    private isODataDestination(destination: Destination): boolean {
        return isGenericODataDestination(destination) || isAbapEnvironmentOnBtp(destination);
    }
}
