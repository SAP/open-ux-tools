/* eslint-disable jsdoc/require-returns */
import type { AnnotationTerm, AnyAnnotation, EntityType } from '@sap-ux/vocabularies-types';
import type { EntityTypeAnnotations } from '@sap-ux/vocabularies-types/vocabularies/Edm_Types';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type File from 'vinyl';
import { getConvertedAnnotations } from './avt';
import type ProjectProvider from './project';

/**
 *
 * @param projectProvider
 */
function getMergedMetadata(projectProvider: ProjectProvider) {
    const files: File[] = [];
    const filePaths = projectProvider.getXmlFiles();
    filePaths.forEach((filePath) => {
        files.push(projectProvider.getFileByPath(filePath));
    });
    return getConvertedAnnotations(files);
}

/**
 *
 * @param projectProvider
 */
export async function getEntityTypes(projectProvider: ProjectProvider) {
    const metadata = getMergedMetadata(projectProvider);
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
 * @param targetName
 * @param annotationTerm
 * @param targetType
 * @param qualifier
 */
export function getAnnotationsForTerm(
    projectProvider: ProjectProvider,
    targetName: string,
    annotationTerm: UIAnnotationTerms,
    targetType = 'EnityType',
    qualifier?: string
) {
    let result: AnnotationTerm<AnyAnnotation> | null = null;
    try {
        const mergedMetadata = getMergedMetadata(projectProvider);
        let target;
        if (targetType === 'EntityType') {
            target = mergedMetadata.entityTypes.by_fullyQualifiedName(targetName);
        } else if (targetType === 'Property') {
            const [entityTypeTarget] = targetName.split('/');
            const entityType = mergedMetadata.entityTypes.by_fullyQualifiedName(entityTypeTarget);
            target = entityType?.entityProperties.by_fullyQualifiedName(targetName);
        } else {
            target = mergedMetadata.actions.by_fullyQualifiedName(targetName);
        }
        if (target) {
            const [vocabularyName, annotationTermName] = getAnnotationTermAlias(annotationTerm);
            target.annotations = target.annotations ?? {};
            (target.annotations as any)[vocabularyName] = target.annotations[vocabularyName] ?? {};
            result = Object.entries(target.annotations[vocabularyName] || {}).find(([key]) =>
                qualifier ? key === `${annotationTermName}#${qualifier}` : key === annotationTermName
            )?.[1] as AnnotationTerm<AnyAnnotation>;
        }
    } catch (error) {
        //
    } finally {
        return Promise.resolve(result);
    }
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
        const mergedMetadata = getMergedMetadata(projectProvider);
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
        if (annotations) {
            Object.entries(annotations).forEach(([key, value]) => {
                if (key && key.indexOf(annotationTerm) === 0) {
                    const qualifier = value.qualifier ? '#' + value.qualifier : '';
                    const navPropertyPath = `${navigationPropertyName ? navigationPropertyName + '/' : ''}`;
                    result[`${navPropertyPath}@${namespaceAlias}.${annotationTerm}` + qualifier] =
                        `${navPropertyPath}@${useNamespace ? namespace : namespaceAlias}.${annotationTerm}` + qualifier;
                }
            });
        }
    });
}
