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

export { YAMLError };
