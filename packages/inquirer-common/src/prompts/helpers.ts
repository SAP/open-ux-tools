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
 * Checks if the given entity set name has aggregate transformations in the metadata.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for aggregate transformations.
 * @returns true if the entity set has aggregate transformations, false otherwise.
 */
export function hasAggregateTransformationsForEntity(metadata: ConvertedMetadata, entitySetName?: string): boolean {
    if (!entitySetName) {
        return false;
    }
    return filterAggregateTransformations(metadata.entitySets).some((entitySet) => entitySet.name === entitySetName);
}

/**
 * Returns only entity sets that have the `Aggregation.ApplySupported` annotation term with the `Transformations` property.
 * This can be found within the entity set annotations or the entity type annotations.
 *
 * @param entitySets the entity sets to filter
 * @returns the filtered entity sets
 */
export function filterAggregateTransformations(entitySets: EntitySet[]): EntitySet[] {
    return entitySets.filter((entitySet) => {
        return (
            !!entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
            !!entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations
        );
    });
}

/**
 * Checks if the given entity set has all the required transformations for analytical table support.
 * The required transformations are: filter, identity, orderby, search, skip, top, groupby, aggregate, concat.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for complete aggregate transformations.
 * @returns true if the entity set has all 9 required transformations, false otherwise.
 */
export function hasCompleteAggregateTransformationsForEntity(
    metadata: ConvertedMetadata,
    entitySetName?: string
): boolean {
    if (!entitySetName) {
        return false;
    }

    const entitySet = metadata.entitySets.find((entitySet) => entitySet.name === entitySetName);
    if (!entitySet) {
        return false;
    }

    // Required transformations for analytical table support
    const requiredTransformations = [
        'filter',
        'identity',
        'orderby',
        'search',
        'skip',
        'top',
        'groupby',
        'aggregate',
        'concat'
    ];

    // Get transformations from entity set or entity type annotations
    const transformations =
        entitySet.annotations?.Aggregation?.ApplySupported?.Transformations ||
        entitySet.entityType?.annotations?.Aggregation?.ApplySupported?.Transformations;

    if (!transformations || !Array.isArray(transformations)) {
        return false;
    }

    // Check if all required transformations are present
    return requiredTransformations.every((transformation) => transformations.includes(transformation));
}

/**
 * Checks if the given entity set name has a Hierarchy.RecursiveHierarchy annotation in the metadata.
 *
 * @param metadata The metadata (edmx) of the service.
 * @param entitySetName The entity set name to check for recursive hierarchy annotation.
 * @returns true if the entity set has Hierarchy.RecursiveHierarchy annotation, false otherwise.
 */
export function hasRecursiveHierarchyForEntity(metadata: ConvertedMetadata, entitySetName?: string): boolean {
    if (!entitySetName) {
        return false;
    }

    const entitySet = metadata.entitySets.find((entitySet) => entitySet.name === entitySetName);
    const hierarchyAnnotations = entitySet?.entityType?.annotations?.Hierarchy;

    if (!hierarchyAnnotations) {
        return false;
    }

    // Check for RecursiveHierarchy annotation (with or without qualifier)
    return Object.keys(hierarchyAnnotations).some((key) => key.startsWith('RecursiveHierarchy'));
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
