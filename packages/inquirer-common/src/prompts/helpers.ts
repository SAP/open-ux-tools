import type { Answers, Question, Validator } from 'inquirer';
import type { CommonPromptOptions, PromptDefaultValue, PromptSeverityMessage, YUIQuestion } from '../types';
import cloneDeep from 'lodash/cloneDeep';
import type { ConvertedMetadata, EntitySet } from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';
import { t } from '../i18n';

/**
 * Extends an additionalMessages function.
 *
 * @param question - the question to which the validate function will be applied
 * @param addMsgFunc - the additional messages function which will be applied to the question
 * @param promptState - the runtime state of the prompts, this can be used to provide additional answers not defined by the prompt answers object
 * @returns the extended additional messages function
 */
export function extendAdditionalMessages(
    question: YUIQuestion,
    addMsgFunc: PromptSeverityMessage,
    promptState?: Answers
): PromptSeverityMessage {
    const addMsgs = question.additionalMessages;
    return (value: unknown, previousAnswers?: Answers | undefined): ReturnType<PromptSeverityMessage> => {
        // Allow non-prompt answer (derived answers) values to be passed to the additional messages function
        // We clone as answers should never be mutatable in prompt functions
        const combinedAnswers = { ...cloneDeep(previousAnswers), ...cloneDeep(promptState) };
        const extMsg = addMsgFunc(value, combinedAnswers);
        if (extMsg) {
            return extMsg; // Extended prompt message is returned first
        }
        // Defer to the original function if a valid message was not returned from the extended version
        return typeof addMsgs === 'function' ? addMsgs(value, previousAnswers) : undefined;
    };
}

/**
 * Extends a validate function. The extended function will be called first.
 *
 * @param question - the question to which the validate function will be applied
 * @param validateFunc - the validate function which will be applied to the question
 * @param promptState - the runtime state of the prompts, this can be used to provide additional answers not defined by the prompt answers object
 * @returns the extended validate function
 */
export function extendValidate<T extends Answers = Answers>(
    question: Question,
    validateFunc: NonNullable<Validator<T>>,
    promptState?: Answers
): NonNullable<Validator<T>> {
    const validate: Validator<T> = question.validate;
    return (value: unknown, previousAnswers?: T): ReturnType<NonNullable<Validator<T>>> => {
        // Allow non-prompt answer (derived answers) values to be passed to the validate function
        const combinedAnswers = { ...cloneDeep(previousAnswers), ...cloneDeep(promptState) } as T;
        const extVal = validateFunc?.(value, combinedAnswers);
        if (extVal !== true) {
            return extVal;
        }
        return typeof validate === 'function' ? validate(value, previousAnswers) : true;
    };
}

/**
 * Extend the existing prompt property function with the one specified in prompt options or add as new.
 *
 * @param question - the question to which the extending function will be applied
 * @param promptOption - prompt options, containing extending functions
 * @param funcName - the question property (function) name to extend
 * @param promptState - the runtime state of the prompts, this can be used to provide additional answers not defined by the prompt answers object
 * @returns the extended question
 */
export function applyExtensionFunction<T extends Answers = Answers>(
    question: YUIQuestion,
    promptOption: CommonPromptOptions<T>,
    funcName: 'validate' | 'additionalMessages',
    promptState?: Answers
): YUIQuestion {
    let extendedFunc;

    if (funcName === 'validate' && promptOption.validate) {
        extendedFunc = extendValidate(question, promptOption.validate, promptState);
    }

    if (funcName === 'additionalMessages' && promptOption.additionalMessages) {
        extendedFunc = extendAdditionalMessages(question, promptOption.additionalMessages, promptState);
    }

    question = Object.assign(question, { [funcName]: extendedFunc });
    return question;
}

/**
 * Adds additional conditions to the provided questions.
 *
 * @param questions the questions to which the condition will be added
 * @param condition function which returns true or false
 * @returns the passed questions reference
 */
export function withCondition(questions: Question[], condition: (answers: Answers) => boolean): Question[] {
    questions.forEach((question) => {
        if (question.when !== undefined) {
            if (typeof question.when === 'function') {
                const when = question.when as (answers: Answers) => boolean | Promise<boolean>;
                question.when = (answers: Answers): boolean | Promise<boolean> => {
                    if (condition(answers)) {
                        return when(answers);
                    } else {
                        return false;
                    }
                };
            } else {
                const whenValue = question.when as boolean;
                question.when = (answers: Answers): boolean => {
                    return condition(answers) && whenValue;
                };
            }
        } else {
            question.when = condition;
        }
    });
    return questions;
}

/**
 * Updates questions with extensions for specific properties. Only `validate`, `default` and `additionalMessages` are currently supported.
 *
 * @param questions - array of prompts to be extended
 * @param promptOptions - the prompt options possibly containing function extensions
 * @param promptState - the runtime state of the prompts, this can be used to provide additional answers not defined by the prompt answers object
 * @returns - the extended questions
 */
export function extendWithOptions<T extends YUIQuestion = YUIQuestion>(
    questions: T[],
    promptOptions: Record<string, Omit<CommonPromptOptions, 'hide'> & PromptDefaultValue<string | boolean>>,
    promptState?: Answers
): YUIQuestion[] {
    questions.forEach((question: YUIQuestion) => {
        const promptOptKey = question.name;
        const promptOpt = promptOptions[question.name];
        if (promptOpt) {
            const propsToExtend = Object.keys(promptOpt);

            for (const extProp of propsToExtend) {
                if (extProp === 'validate' || extProp === 'additionalMessages') {
                    question = applyExtensionFunction(question, promptOpt as CommonPromptOptions, extProp, promptState);
                }
                // Provided defaults will override built in defaults
                const defaultOverride = (promptOptions[promptOptKey] as PromptDefaultValue<string | boolean>).default;
                if (defaultOverride) {
                    question.default = defaultOverride;
                }
            }
        }
    });
    return questions;
}

/**
 * Required transformations for analytical table support.
 * NOTE: This constant is primarily used by odata-service-inquirer but is exported
 * here to maintain backward compatibility with external packages that import it.
 */
export const transformationsRequiredForAnalyticalTable = [
    'filter',
    'identity',
    'orderby',
    'skip',
    'top',
    'groupby',
    'aggregate',
    'concat'
] as const;

/**
 * Annotation pattern for RecursiveHierarchy.
 */
const RECURSIVE_HIERARCHY_ANNOTATION = 'RecursiveHierarchy';

/**
 * Checks if the given entity set has aggregate transformations.
 * Returns true if ANY transformations are present in either entity set or entity type annotations.
 *
 * @param entitySet The entity set to check for aggregate transformations.
 * @returns true if the entity set has any aggregate transformations, false otherwise.
 */
export function hasAggregateTransformations(entitySet: EntitySet): boolean {
    const transformations =
        entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
        entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations;

    return !!transformations && Array.isArray(transformations) && transformations.length > 0;
}

/**
 * Returns only entity sets that have the `Aggregation.ApplySupported` annotation term with the `Transformations` property.
 * This can be found within the entity set annotations or the entity type annotations.
 *
 * @param entitySets the entity sets to filter
 * @returns the filtered entity sets
 */
export function filterAggregateTransformations(entitySets: EntitySet[]): EntitySet[] {
    return entitySets.filter(hasAggregateTransformations);
}

/**
 * Checks if the given entity set name has aggregate transformations in the metadata.
 * If specific transformations are provided, checks if ALL of those transformations are present.
 * If no transformations are specified, returns true if ANY transformations are present.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for aggregate transformations.
 * @param requiredTransformations Optional array of specific transformations to check for. If not provided, checks for any transformations.
 * @returns true if the entity set has the required transformations, false otherwise.
 */
export function hasAggregateTransformationsForEntity(
    metadata: ConvertedMetadata,
    entitySetName: string,
    requiredTransformations?: readonly string[]
): boolean {
    const entitySet = findEntitySetByName(metadata, entitySetName);
    if (!entitySet) {
        return false;
    }

    return hasAggregateTransformationsForEntitySet(entitySet, requiredTransformations);
}

/**
 * Checks if the given entity set name has a Hierarchy.RecursiveHierarchy annotation in the metadata.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
export function hasRecursiveHierarchyForEntity(metadata: ConvertedMetadata, entitySetName: string): boolean {
    const entitySet = findEntitySetByName(metadata, entitySetName);
    if (!entitySet) {
        return false;
    }

    return hasRecursiveHierarchyForEntitySet(entitySet);
}

/**
 * Gets the qualifier from a Hierarchy.RecursiveHierarchy annotation for the given entity set.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for recursive hierarchy annotation.
 * @returns The qualifier string if found, undefined otherwise.
 */
export function getRecursiveHierarchyQualifier(metadata: ConvertedMetadata, entitySetName: string): string | undefined {
    const entitySet = findEntitySetByName(metadata, entitySetName);
    if (!entitySet) {
        return undefined;
    }

    return getRecursiveHierarchyQualifierForEntitySet(entitySet);
}

/**
 * Checks if the given entity set has aggregate transformations.
 * If specific transformations are provided, checks if ALL of those transformations are present.
 * If no transformations are specified, returns true if ANY transformations are present.
 *
 * @param entitySet The entity set to check for aggregate transformations.
 * @param requiredTransformations Optional array of specific transformations to check for. If not provided, checks for any transformations.
 * @returns true if the entity set has the required transformations, false otherwise.
 */
export function hasAggregateTransformationsForEntitySet(
    entitySet: EntitySet,
    requiredTransformations?: readonly string[]
): boolean {
    const transformations =
        entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
        entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations;

    if (!transformations || !Array.isArray(transformations)) {
        return false;
    }

    // If no specific transformations required, return true if any transformations exist
    if (!requiredTransformations || requiredTransformations.length === 0) {
        return transformations.length > 0;
    }

    // Check if all required transformations are present
    return requiredTransformations.every((transformation) => transformations.includes(transformation));
}

/**
 * Finds the RecursiveHierarchy annotation key for the given entity set.
 * This is a helper function that both existence check and qualifier extraction can use.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns The RecursiveHierarchy key if found, undefined otherwise.
 */
function findRecursiveHierarchyKey(entitySet: EntitySet): string | undefined {
    const hierarchyAnnotations = entitySet?.entityType?.annotations?.Hierarchy;

    if (!hierarchyAnnotations) {
        return undefined;
    }

    // First try exact match for the most common case
    if (hierarchyAnnotations[RECURSIVE_HIERARCHY_ANNOTATION]) {
        return RECURSIVE_HIERARCHY_ANNOTATION;
    }

    // Then check for qualified versions (RecursiveHierarchy#qualifier)
    return Object.keys(hierarchyAnnotations).find((key) => key.startsWith(RECURSIVE_HIERARCHY_ANNOTATION));
}

/**
 * Checks if the given entity set has a Hierarchy.RecursiveHierarchy annotation.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
export function hasRecursiveHierarchyForEntitySet(entitySet: EntitySet): boolean {
    return !!findRecursiveHierarchyKey(entitySet);
}

/**
 * Gets the qualifier from a Hierarchy.RecursiveHierarchy annotation for the given entity set.
 *
 * @param entitySet The entity set to check for recursive hierarchy annotation.
 * @returns The qualifier string if found, undefined otherwise.
 */
export function getRecursiveHierarchyQualifierForEntitySet(entitySet: EntitySet): string | undefined {
    const recursiveHierarchyKey = findRecursiveHierarchyKey(entitySet);

    if (!recursiveHierarchyKey) {
        return undefined;
    }

    // Extract qualifier if present (format: "RecursiveHierarchy#qualifier" or just "RecursiveHierarchy")
    return recursiveHierarchyKey.includes('#') ? recursiveHierarchyKey.split('#')[1] : undefined;
}

/**
 * Finds an entity set by name in the metadata.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The name of the entity set to find.
 * @returns The entity set if found, undefined otherwise.
 */
export function findEntitySetByName(metadata: ConvertedMetadata, entitySetName: string): EntitySet | undefined {
    return metadata.entitySets.find((entitySet) => entitySet.name === entitySetName);
}

/**
 * Converts an EDMX string to a ConvertedMetadata object.
 *
 * @param edmx - The EDMX string to convert.
 * @returns The converted metadata object.
 * @throws If the EDMX cannot be parsed or the OData version is unparseable.
 */
export function convertEdmxToConvertedMetadata(edmx: string): ConvertedMetadata {
    try {
        const convertedMetadata = convert(parse(edmx));
        const parsedOdataVersion = Number.parseInt(convertedMetadata?.version, 10);
        if (Number.isNaN(parsedOdataVersion)) {
            throw new Error(t('errors.unparseableOdataVersion'));
        }
        return convertedMetadata;
    } catch (error) {
        throw new Error(t('errors.unparseableMetadata', { error: (error as Error).message }));
    }
}
