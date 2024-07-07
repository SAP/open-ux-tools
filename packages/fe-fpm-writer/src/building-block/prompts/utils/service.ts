/* eslint-disable jsdoc/require-returns */
import type { ConvertedMetadata, EntityType } from '@sap-ux/vocabularies-types';
import type { EntityTypeAnnotations } from '@sap-ux/vocabularies-types/vocabularies/Edm_Types';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { ProjectProvider } from './project';
import { convert } from '@sap-ux/annotation-converter';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import { getCapServiceName } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import type { BindingContextType } from '../../types';

/**
 * Method returns service name for passed CAP project service.
 *
 * @param project - project
 * @param serviceName - service name to lookup
 * @param appName  - app name in CAP project
 * @returns resolved service name
 */
export async function getMappedServiceName(project: Project, serviceName: string, appName: string): Promise<string> {
    let mappedServiceName = serviceName;
    if (['CAPJava', 'CAPNodejs'].includes(project.projectType)) {
        // Fetch the CDS service name by mapping it to the URI if the app's service is not the same
        const appServiceName = getMainService(project, appName);
        if (appServiceName) {
            mappedServiceName = await getCapServiceName(
                project.root,
                project.apps[appName].services[appServiceName].uri ?? ''
            );
        }
    }
    return mappedServiceName;
}

/**
 * Method returns service object for passed service name.
 *
 * @param project - project
 * @param serviceName - service name to lookup
 * @param appName - app name in CAP project
 * @param sync -
 * @returns resolved service name
 */
export async function getAnnotationService(
    project: Project,
    serviceName: string,
    appName: string,
    sync = true
): Promise<FioriAnnotationService> {
    const mappedServiceName = await getMappedServiceName(project, serviceName, appName);
    const service = await FioriAnnotationService.createService(project, mappedServiceName, appName);
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
    const annotationService = await getAnnotationService(project, serviceName, appName);
    return getMergedMetadata(annotationService);
};

// ToDo - is there otherway?
function getMainService(project: Project, appId?: string): string {
    let mainService: string | undefined;
    if (appId === undefined) {
        const appIds = Object.keys(project.apps);
        mainService = project.apps[appIds[0]].mainService;
    } else {
        const app = project.apps[appId];
        if (!app) {
            throw new Error('ERROR_INVALID_APP_ID');
        }
        mainService = app.mainService;
    }
    return mainService ?? 'mainService';
}

/**
 *
 * @param projectProvider
 * @returns
 */
export async function getEntityTypes(projectProvider: ProjectProvider) {
    const project = await projectProvider.getProject();
    const metadata = await getServiceMetadata(
        project,
        getMainService(project, projectProvider.appId),
        projectProvider.appId
    );
    return Array.from(metadata.entityTypes);
}

/**
 *
 * @param annotationTerm
 */
export function getAnnotationTermAlias(annotationTerm: UIAnnotationTerms): [keyof EntityTypeAnnotations, string] {
    const [, , , vocabularyName, , annotationTermName] = annotationTerm.split('.');
    return [vocabularyName as keyof EntityTypeAnnotations, annotationTermName];
}

/**
 *
 * @param projectProvider
 * @param entity
 * @param annotationTerm
 * @param bindingContext
 * @param useNamespace
 */
export async function getAnnotationPathQualifiers(
    projectProvider: ProjectProvider,
    entity: string,
    annotationTerm: UIAnnotationTerms[],
    bindingContext: { type: BindingContextType; isCollection?: boolean },
    useNamespace = false
) {
    const result: Record<string, string> = {};
    try {
        const project = await projectProvider.getProject();
        const annotationService = await getAnnotationService(
            project,
            getMainService(project, projectProvider.appId),
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
            getAnnotationPathQualifiersForEntityType(entityType, annotationTerm, result, useNamespace, bindingContext);
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
 * @param bindingContext
 */
function getAnnotationPathQualifiersForEntityType(
    entityType: EntityType,
    annotationTerms: UIAnnotationTerms[],
    result: Record<string, string>,
    useNamespace: boolean,
    bindingContext: { type: BindingContextType; isCollection?: boolean }
) {
    if (bindingContext.type === 'absolute') {
        addAnnotationPathQualifierToResult(entityType, '', annotationTerms, result, useNamespace);
    } else if (bindingContext.type === 'relative') {
        entityType.navigationProperties.forEach((navigationProperty) => {
            if (
                navigationProperty.targetType &&
                navigationProperty.targetType._type === 'EntityType' &&
                navigationProperty.name !== 'SiblingEntity'
            ) {
                if (!bindingContext.isCollection || (bindingContext.isCollection && navigationProperty.isCollection)) {
                    addAnnotationPathQualifierToResult(
                        navigationProperty.targetType,
                        navigationProperty.name,
                        annotationTerms,
                        result,
                        useNamespace
                    );
                }
            }
        });
    }
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
    result: Record<string, string>,
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
