import type { ConvertedMetadata, EntitySet, EntityType } from '@sap-ux/vocabularies-types';
import type { EntityTypeAnnotations } from '@sap-ux/vocabularies-types/vocabularies/Edm_Types';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { convert } from '@sap-ux/annotation-converter';
import { FioriAnnotationService } from '@sap-ux/fiori-annotation-api';
import { getCapServiceName } from '@sap-ux/project-access';
import type { Project } from '@sap-ux/project-access';
import type { BindingContextType } from '../../types';

/**
 * Defines binding context to filter annotation terms.
 */
interface BindingContext {
    // binding context type: 'absolute' or 'relative'
    type: BindingContextType;
    // indiates whether to filter navigation properties with 1 to n relationship if context type is 'relative'
    isCollection?: boolean;
}

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
                project.apps[appName]?.services?.[appServiceName].uri ?? ''
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
 * @param sync - option to refresh file content from the file system
 * @returns resolved Annotation service
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

/**
 * Method to get and convert metadata.
 *
 * @param annotationService - Fiori Annotation service
 * @returns coverted metadata object
 */
export function getMergedMetadata(annotationService: FioriAnnotationService): ConvertedMetadata {
    const rawMetadata = annotationService.getSchema();
    return convert(rawMetadata);
}

/**
 * Method returns converted metadata object.
 *
 * @param project - project
 * @param serviceName - project service name
 * @param appName - application id
 * @returns resolved converted metadata object
 */
const getServiceMetadata = async (
    project: Project,
    serviceName: string,
    appName: string
): Promise<ConvertedMetadata> => {
    const annotationService = await getAnnotationService(project, serviceName, appName);
    return getMergedMetadata(annotationService);
};

/**
 * Method returns main service of the application.
 *
 * @param project = project
 * @param appId - application id
 * @returns main service name
 */
function getMainService(project: Project, appId: string): string {
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
 * Method gets available entity sets in project.
 *
 * @param project = project
 * @param appId = app id
 * @returns an array of entity sets
 */
export async function getEntitySets(project: Project, appId: string): Promise<EntitySet[]> {
    const metadata = await getServiceMetadata(project, getMainService(project, appId), appId);
    return Array.from(metadata.entitySets);
}

/**
 * Method to get the annotation term alias.
 *
 * @param annotationTerm - annotation term
 * @returns an array of entity type annotations with annotation term name
 */
export function getAnnotationTermAlias(annotationTerm: UIAnnotationTerms): [keyof EntityTypeAnnotations, string] {
    const [, , , vocabularyName, , annotationTermName] = annotationTerm.split('.');
    return [vocabularyName as keyof EntityTypeAnnotations, annotationTermName];
}

/**
 * Method to get the annotation path qualifiers for entity.
 *
 * @param project - project
 * @param appId app id in CAP project
 * @param entity - entity or entity type name
 * @param annotationTerm - annotation term names to search
 * @param bindingContext - binding context to filter the annotations
 * @param useNamespace - indicates to use namespace or namespace alias
 * @returns a record of annotation path qualifier terms
 */
export async function getAnnotationPathQualifiers(
    project: Project,
    appId: string,
    entity: string,
    annotationTerm: UIAnnotationTerms[],
    bindingContext: BindingContext,
    useNamespace = false
): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    try {
        const annotationService = await getAnnotationService(project, getMainService(project, appId), appId);
        const mergedMetadata = getMergedMetadata(annotationService);
        const entitySet = mergedMetadata.entitySets.by_name(entity);
        const entityType = entitySet?.entityType;
        if (entityType) {
            getAnnotationPathQualifiersForEntityType(entityType, annotationTerm, result, useNamespace, bindingContext);
        }
    } catch (error) {
        throw new Error(`An error occurred while reading the annotation path qualifiers. Details: ${error}`);
    }
    return result;
}

/**
 * Method to get annotation path qualifiers and add to result.
 *
 * @param entityType - entity type name
 * @param annotationTerms - annotation term names to search
 * @param result - a record of annotation path qualifier terms
 * @param useNamespace - indicates to use namespace or namespace alias
 * @param bindingContext - binding context to filter the annotations
 */
function getAnnotationPathQualifiersForEntityType(
    entityType: EntityType,
    annotationTerms: UIAnnotationTerms[],
    result: Record<string, string>,
    useNamespace: boolean,
    bindingContext: BindingContext
): void {
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
 *  Method to add found annotation paths to result.
 *
 * @param entityType - entity type name
 * @param navigationPropertyName - navigation property name to include in the annotation path
 * @param annotationTerms - annotation term names to search
 * @param result - a record of annotation path qualifier terms
 * @param useNamespace - indicates to use namespace or namespace alias
 */
function addAnnotationPathQualifierToResult(
    entityType: EntityType,
    navigationPropertyName: string,
    annotationTerms: UIAnnotationTerms[],
    result: Record<string, string>,
    useNamespace = false
): void {
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
