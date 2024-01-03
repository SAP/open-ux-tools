import type { VocabularyService, ComplexTypeProperty, Term } from '@sap-ux/odata-vocabularies';

import type { Context } from './visitor-state';

/**
 * Gets the implicit property type based on the provided vocabulary service, context, and property name.
 *
 * @param {VocabularyService} vocabularyService - The vocabulary service.
 * @param {Context} context - The context containing recordType, termType, etc.
 * @param {string} propertyName - The name of the property for which to get the type.
 * @returns {ComplexTypeProperty | undefined} The implicit property type or undefined if not found.
 */
export function getImplicitPropertyType(
    vocabularyService: VocabularyService,
    context: Context,
    propertyName: string
): ComplexTypeProperty | undefined {
    let baseType: string | undefined;
    if (context.recordType) {
        baseType = getFullyQualifiedType(vocabularyService, context.recordType);
    }
    if (!baseType && context.termType) {
        baseType = vocabularyService.getTerm(context.termType)?.type;
    }
    return getPropertyTypeFromBaseType(vocabularyService, baseType, propertyName);
}
/**
 * Gets the property type from the provided vocabulary service based on the specified record type and property name.
 *
 * @param {VocabularyService} vocabularyService - The vocabulary service.
 * @param {string | undefined} recordType - The record type for which to retrieve the property type.
 * @param {string} propertyName - The name of the property for which to get the type.
 * @returns {ComplexTypeProperty | undefined} The property type or undefined if not found.
 */
export function getPropertyType(
    vocabularyService: VocabularyService,
    recordType: string | undefined,
    propertyName: string
): ComplexTypeProperty | undefined {
    if (!recordType) {
        return undefined;
    }
    const baseType = getFullyQualifiedType(vocabularyService, recordType);

    return getPropertyTypeFromBaseType(vocabularyService, baseType, propertyName);
}

/**
 * Gets the property type from the base type using the provided vocabulary service, base type, and property name.
 *
 * @param {VocabularyService} vocabularyService - The vocabulary service.
 * @param {string | undefined} baseType - The base type from which to retrieve the property type.
 * @param {string} propertyName - The name of the property for which to get the type.
 * @returns {ComplexTypeProperty | undefined} The property type or undefined if not found.
 */
function getPropertyTypeFromBaseType(
    vocabularyService: VocabularyService,
    baseType: string | undefined,
    propertyName: string
): ComplexTypeProperty | undefined {
    if (!baseType) {
        return undefined;
    }
    const derivedTypeNames = [...vocabularyService.getDerivedTypeNames(baseType)];
    for (const derivedTypeName of derivedTypeNames) {
        const propertyType = vocabularyService.getComplexTypeProperty(derivedTypeName, propertyName);
        if (propertyType) {
            return propertyType;
        }
    }
    return undefined;
}

/**
 *
 * @param {VocabularyService} service - The vocabulary service.
 * @param {string} type - The type string to be qualified.
 * @returns {string | undefined} The fully qualified type string or undefined if the namespace is not found.
 */
export function getFullyQualifiedType(service: VocabularyService, type: string): string | undefined {
    const [simpleIdentifier] = type.split('.').slice(-1);
    const namespace = service.getVocabularyNamespace(type);
    if (namespace) {
        return [namespace, simpleIdentifier].join('.');
    }
    return undefined;
}

/**
 * Gets a term from the provided vocabulary service based on the specified vocabulary name or alias and term name.
 *
 * @param {VocabularyService} vocabularyService - The vocabulary service.
 * @param {string} vocabularyNameOrAlias - The name or alias of the vocabulary.
 * @param {string | undefined} termName - The name of the term to retrieve, if available.
 * @returns {Term | undefined} The retrieved term or undefined if not found.
 */
export function getTerm(
    vocabularyService: VocabularyService,
    vocabularyNameOrAlias: string,
    termName: string | undefined
): Term | undefined {
    const vocabulary = vocabularyService.getVocabulary(vocabularyNameOrAlias);
    if (vocabulary && termName) {
        const fullyQualifiedTermName = [vocabulary.namespace, termName].join('.');
        const term = vocabularyService.getTerm(fullyQualifiedTermName);
        if (term) {
            return term;
        }
    }
    return undefined;
}
