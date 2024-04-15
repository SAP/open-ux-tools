/* eslint-disable jsdoc/require-returns */
import type { ConvertedMetadata, EntityType } from '@sap-ux/vocabularies-types';
import type { EntityTypeAnnotations } from '@sap-ux/vocabularies-types/vocabularies/Edm_Types';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type ProjectProvider from './project';
import { convert } from '@sap-ux/annotation-converter';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';

import { Project, getCapServiceName } from '@sap-ux/project-access';
import { ProjectTemp } from './project-convertor';

export async function getMappedServiceName(project: Project, serviceName: string, appName: string): Promise<string> {
    let mappedServiceName = serviceName;
    if (['CAPJava', 'CAPNodejs'].includes(project.projectType)) {
        // Fetch the CDS service name by mapping it to the URI if the app's service is not the same
        const appServiceName = project.apps[appName].mainService;
        if (appServiceName) {
            mappedServiceName = await getCapServiceName(
                project.root,
                project.apps[appName].services[appServiceName].uri || ''
            );
        }
    }
    return mappedServiceName;
}
export async function getAnnotationService(
    project: ProjectTemp,
    serviceName: string,
    appName: string,
    sync = true
): Promise<FioriAnnotationService> {
    const mappedServiceName = await getMappedServiceName(project, serviceName, appName);
    const service = await FioriAnnotationService.createService(project as any, mappedServiceName, appName);
    if (sync) {
        await service.sync();
    }
    return service;
}

export function getMergedMetadata(annotationService: FioriAnnotationService): ConvertedMetadata {
    const rawMetadata = annotationService.getSchema();
    return convert(rawMetadata);
}

const getServiceMetadata = async (project: Project, serviceName: string, appName: string) => {
    const annotationService = await getAnnotationService(project as any, serviceName, appName);
    return getMergedMetadata(annotationService);
};

/**
 *
 * @param projectProvider
 * @param appName
 * @returns
 */
export async function getEntityTypes(projectProvider: ProjectProvider) {
    const project = await projectProvider.getProject();
    const metadata = await getServiceMetadata(project as any, project.mainService, projectProvider.appId);
    return Array.from(metadata.entityTypes);
}

/**
 *
 * @param annotationTerm
 */
export function getAnnotationTermAlias(annotationTerm: UIAnnotationTerms) {
    const [, , , vocabularyName, , annotationTermName] = annotationTerm.split('.');
    return [vocabularyName, annotationTermName] as [keyof EntityTypeAnnotations, string];
}

/**
 *
 * @param projectProvider
 * @param entity
 * @param annotationTerm
 * @param useNamespace
 */
export async function getAnnotationPathQualifiers(
    projectProvider: ProjectProvider,
    entity: string,
    annotationTerm: UIAnnotationTerms[],
    useNamespace = false
) {
    const result: Record<string, string> = {};
    try {
        const project = await projectProvider.getProject();
        const annotationService = await getAnnotationService(
            project as any,
            project.apps[projectProvider.appId].mainService!,
            projectProvider.appId
        );
        const mergedMetadata = getMergedMetadata(annotationService);
        let entityType = mergedMetadata.entityTypes.by_fullyQualifiedName(entity);
        if (!entityType) {
            const entitySet = mergedMetadata.entitySets.by_name(entity);
            if (entitySet) {
                entityType = entitySet.entityType;
            }
        }
        if (entityType) {
            getAnnotationPathQualifiersForEntityType(entityType, annotationTerm, result, useNamespace);
        }
    } catch (error) {
        throw new Error(`An error occurred while reading the annotation path qualifiers. Details: ${error}`);
    }
    return result;
}

/**
 *
 * @param entityType
 * @param annotationTerms
 * @param result
 * @param useNamespace
 */
function getAnnotationPathQualifiersForEntityType(
    entityType: EntityType,
    annotationTerms: UIAnnotationTerms[],
    result: any,
    useNamespace: boolean
) {
    addAnnotationPathQualifierToResult(entityType, '', annotationTerms, result, useNamespace);
    entityType.navigationProperties.forEach((navigationProperty) => {
        if (
            navigationProperty.targetType &&
            navigationProperty.targetType._type === 'EntityType' &&
            navigationProperty.name !== 'SiblingEntity'
        ) {
            addAnnotationPathQualifierToResult(
                navigationProperty.targetType,
                navigationProperty.name,
                annotationTerms,
                result,
                useNamespace
            );
        }
    });
}

/**
 *
 * @param entityType
 * @param navigationPropertyName
 * @param annotationTerms
 * @param result
 * @param useNamespace
 */
function addAnnotationPathQualifierToResult(
    entityType: EntityType,
    navigationPropertyName: string,
    annotationTerms: UIAnnotationTerms[],
    result: any,
    useNamespace = false
) {
    annotationTerms.forEach((uiAnnotationTerm) => {
        const [namespaceAlias, annotationTerm] = getAnnotationTermAlias(uiAnnotationTerm);
        const namespace = uiAnnotationTerm.substring(0, uiAnnotationTerm.lastIndexOf('.'));
        const annotations = entityType.annotations[namespaceAlias];
        if (!annotations) {
            return;
        }
        Object.entries(annotations).forEach(([key, value]) => {
            if (key.startsWith(annotationTerm)) {
                const qualifier = value.qualifier ? '#' + value.qualifier : '';
                const navPropertyPath = `${navigationPropertyName ? navigationPropertyName + '/' : ''}`;
                result[`${navPropertyPath}@${namespaceAlias}.${annotationTerm}` + qualifier] =
                    `${navPropertyPath}@${useNamespace ? namespace : namespaceAlias}.${annotationTerm}` + qualifier;
            }
        });
    });
}
