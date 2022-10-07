import { interpolate } from '../texts';
import type { StringMap } from '../texts';
import { YAMLError } from './yaml-error';

export const errorCode = Object.freeze({
    yamlParsing: 'yamlParsing',
    nodeNotFound: 'nodeNotFound',
    nodeNotFoundMatching: 'nodeNotFoundMatching',
    nodeNotAMap: 'nodeNotAMap',
    propertyNotFound: 'propertyNotFound',
    pathCannotBeEmpty: 'pathCannotBeEmpty',
    pathDoesNotExist: 'pathDoesNotExist',
    seqDoesNotExist: 'seqDoesNotExist',
    tryingToAppendToNonSequence: 'tryingToAppendToNonSequence',
    startNodeMustBeCollection: 'startNodeMustBeCollection',
    scalarValuesDoNotHaveProperties: 'scalarValuesDoNotHaveProperties'
});

export type ErrorTemplate = Record<string, string>;

export const errorTemplate: Readonly<ErrorTemplate> = Object.freeze({
    yamlParsing: 'Error parsing YAML document',
    nodeNotFound: 'Node not found at path: [{{- path }}]',
    nodeNotFoundMatching: 'Node not found at path: [{{- path }}, matching [{{- key }} = {{- value }}]',
    nodeNotAMap: 'Node path: [{{- path }}, matching [{{- key }} = {{- value }}], is not a map',
    propertyNotFound: 'Node not found at path: [{{- path }}]',
    pathCannotBeEmpty: 'Path cannot be empty',
    pathDoesNotExist: 'Parent node does not exist at: [{{- path }}]',
    seqDoesNotExist: 'Sequence does not exist at: [{{- path }}]',
    tryingToAppendToNonSequence: 'Cannot append to non-sequence at: [{{- path }}]',
    startNodeMustBeCollection: 'Starting node must be an array or an object',
    scalarValuesDoNotHaveProperties: 'Scalar values do not have properties'
});

/**
 * Create a new error with `code` correctly set.
 *
 * @param options - Options object
 * @param {string} options.code - error code
 * @param {string} options.message  - optional message for Error.message
 * @param {StringMap} options.templateReplacements -  values for message template interpolation
 * @returns {Error} - Error with correct code set
 */
export function newError({
    code,
    templateReplacements,
    message
}: {
    code: string;
    message?: string;
    templateReplacements?: StringMap;
}): Error {
    if (typeof message === 'string') {
        return new YAMLError(message, code);
    } else {
        return new YAMLError(interpolate(errorTemplate[code], templateReplacements), code);
    }
}

export { YAMLError };
