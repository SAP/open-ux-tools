import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import type { MetadataService } from '@sap-ux/odata-entity-model';
import type { MetadataElement } from '@sap-ux/odata-annotation-core-types';
import { getProject } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import { convert } from '@sap-ux/annotation-converter';

export type ServiceOptions = { project: Project; serviceName: string; appName: string };

type MetadataNode = {
    path: string;
    name: string;
    kind: string; // first edmTargetKind
    mdElement: MetadataElement;
};

export interface AllowedEntity {
    entitySet: string;
    entityType: string;
    navigations: AllowedNavigation[];
}

export interface AllowedNavigation {
    name: string;
    fullyQualifiedName?: string;
    entitySet: string;
}

/**
 *
 */
export class Service {
    metadataService?: MetadataService;
    annotationService?: FioriAnnotationService;
    nodes: MetadataNode[] = [];
    nodesMap: Map<string, MetadataNode> = new Map();
    private namespace: string = '';

    /**
     *
     * @param options
     */
    constructor(private options: ServiceOptions) {}
    /**
     *
     * @param refresh
     */
    private async loadMetadata(refresh = false): Promise<void> {
        if (!refresh && this.metadataService) {
            return;
        }
        const { project, serviceName, appName } = this.options;
        const projectNew = await getProject(project.root);
        this.annotationService = await FioriAnnotationService.createService(projectNew, serviceName, appName);
        await this.annotationService.sync();
        this.metadataService = this.annotationService.getMetadataService();
        this.namespace = [...this.metadataService.getNamespaces()][0];
        this.metadataService.visitMetadataElements(this.visitMdElement.bind(this));
    }
    /**
     *
     * @param mdElement
     */
    visitMdElement(mdElement: MetadataElement) {
        const { path, name } = mdElement;
        const kind = this.metadataService?.getEdmTargetKinds(path)[0] || '';
        const metadataNode = { path, name, mdElement, kind };
        this.nodes?.push(metadataNode);
        this.nodesMap.set(path, metadataNode);
    }

    /**
     * Retrieves the namespace for the current instance.
     *
     * @returns {Promise<string>} A promise that resolves to the namespace string.
     */
    public async getNamespace(): Promise<string> {
        await this.loadMetadata();
        return this.namespace;
    }

    /**
     * Retrieves a list of allowed entities from the loaded metadata.
     * Each entity includes its entity set name, entity type, and navigable properties
     * that are collections (i.e., to-many relationships).
     *
     * @param refresh Refresh metadata by avoiding cached values.
     * @returns A promise that resolves to an array of allowed entities with their navigations.
     */
    public async getAllowedEntities(refresh = false): Promise<AllowedEntity[]> {
        await this.loadMetadata(refresh);
        if (!this.annotationService) {
            return [];
        }
        const allowedEntities: AllowedEntity[] = [];
        const rawMetadata = this.annotationService.getSchema();
        const metadata = convert(rawMetadata);
        for (const entitySet of metadata.entitySets) {
            allowedEntities.push({
                entitySet: entitySet.name,
                entityType: entitySet.entityType.name,
                navigations: entitySet.entityType.navigationProperties
                    .filter((navigationProperty) => navigationProperty.isCollection)
                    .map((navigationProperty) => {
                        const entityType = navigationProperty.targetType;
                        const entitySet = metadata.entitySets.find(
                            (entitySet) => entitySet.entityTypeName === entityType.name
                        );
                        return {
                            name: navigationProperty.name,
                            fullyQualifiedName: navigationProperty.fullyQualifiedName,
                            entitySet: entitySet?.name ?? entityType.name
                        };
                    })
            });
        }
        return allowedEntities;
    }

    /**
     * Retrieves the allowed navigation properties for a given entity set or entity type.
     * These are filtered from the allowed entities' navigation collections.
     *
     * @param entitySet Optional entity set name to match.
     * @param entityType Optional entity type name to match.
     * @param refresh Refresh metadata by avoiding cached values.
     * @returns A promise that resolves to an array of allowed navigations.
     */
    public async getAllowedNavigations(
        entitySet?: string,
        entityType?: string,
        refresh = false
    ): Promise<AllowedNavigation[]> {
        const allowedEntities = this.getAllowedEntities(refresh);
        return (
            (await allowedEntities).find(
                (allowedEntity) => allowedEntity.entitySet === entitySet || allowedEntity.entityType === entityType
            )?.navigations ?? []
        );
    }
}
