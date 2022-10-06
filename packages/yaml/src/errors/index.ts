import { interpolate } from '../texts';
import type { StringMap } from '../texts';

export interface YamlError {
    code: string;
    messageTemplate: string;
}

export const errors: Readonly<{ [err: string]: YamlError }> = Object.freeze({
    yamlParsing: { code: 'yamlParsing', messageTemplate: 'Error parsing YAML document' },
    nodeNotFound: { code: 'nodeNotFound', messageTemplate: 'Node not found at path: [{{- path }}]' },
    nodeNotFoundMatching: {
        code: 'nodeNotFoundMatching',
        messageTemplate: 'Node not found at path: [{{- path }}, matching [{{- key }} = {{- value }}]'
    },
    nodeNotAMap: {
        code: 'nodeNotAMap',
        messageTemplate: 'Node path: [{{- path }}, matching [{{- key }} = {{- value }}], is not a map'
    },
    propertyNotFound: { code: 'propertyNotFound', messageTemplate: 'Node not found at path: [{{- path }}]' },
    pathCannotBeEmpty: { code: 'pathCannotBeEmpty', messageTemplate: 'Path cannot be empty' },
    pathDoesNotExist: { code: 'pathDoesNotExist', messageTemplate: 'Parent node does not exist at: [{{- path }}]' },
    seqDoesNotExist: { code: 'seqDoesNotExist', messageTemplate: 'Sequence does not exist at: [{{- path }}]' },
    tryingToAppendToNonSequence: {
        code: 'tryingToAppendToNonSequence',
        messageTemplate: 'Cannot append to non-sequence at: [{{- path }}]'
    },
    startNodeMustBeCollection: {
        code: 'startNodeMustBeCollection',
        messageTemplate: 'Starting node must be an array or an object'
    },
    scalarValuesDoNotHaveProperties: {
        code: 'scalarValuesDoNotHaveProperties',
        messageTemplate: 'Scalar values do not have properties'
    }
});

/**
 * Create a new error with `code` correctly set.
 *
 * @param options - Options object
 * @param {YamlError} options.error - YAML error
 * @param {string} options.message  - optional message for Error.message
 * @param {StringMap} options.templateReplacements -  values for message template interpolation
 * @returns {Error} - Error with correct code set
 */
export function newError({
    error,
    templateReplacements,
    message
}: {
    error: YamlError;
    message?: string;
    templateReplacements?: StringMap;
}): Error {
    let err: Error;
    if (typeof message === 'string') {
        err = new Error(message);
    } else {
        err = new Error(interpolate(error.messageTemplate, templateReplacements));
    }
    // The version of @types/node does not have a `code` property yet
    (err as any).code = error.code;
    return err;
}
