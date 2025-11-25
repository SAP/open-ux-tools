import { join } from 'node:path';
import { join as joinPosix } from 'node:path/posix';

import type { Editor } from 'mem-fs-editor';
import prettifyXml from 'prettify-xml';

import type {
    AnnotationList,
    AnnotationRecord,
    ConvertedMetadata,
    RawAnnotation,
    RawSchema,
    StringExpression
} from '@sap-ux/vocabularies-types';
import { convert } from '@sap-ux/annotation-converter';
import { parse } from '@sap-ux/edmx-parser';

import { DirName } from '@sap-ux/project-access';
import type { ExternalService, ExternalServiceReference } from '@sap-ux/axios-extension';

import type { ExternalServiceCollectionOptions } from '../types';

const INDENT_SIZE = 4;

/**
 * Writes service metadata for external service references to the local service folder.
 *
 * @param fs - Memfs editor instance
 * @param webappPath - Webapp path of the UI5 application
 * @param externalServices - External service metadata to be written
 * @param serviceName - Name of the service, defaults to 'mainService'
 * @param servicePath - Service path of the service
 */
export function writeExternalServiceMetadata(
    fs: Editor,
    webappPath: string,
    externalServices: ExternalService[],
    serviceName = 'mainService',
    servicePath?: string
): void {
    if (!externalServices.length || !servicePath) {
        return;
    }
    const processedServices = new Set<string>();
    for (const reference of externalServices) {
        const relativeServicePath = getServiceRoot(servicePath, reference.path);
        const filePathSegments = [webappPath, DirName.LocalService, serviceName, relativeServicePath];

        const servicePathWithoutParameters = reference.path.split(';')[0];
        if (reference.entityData && !processedServices.has(servicePathWithoutParameters)) {
            for (const entitySetData of reference.entityData) {
                const entityDataPath = join(...filePathSegments, `${entitySetData.entitySetName}.json`);
                fs.write(entityDataPath, JSON.stringify(entitySetData.items, undefined, INDENT_SIZE));
            }
            processedServices.add(servicePathWithoutParameters);
        }

        if (reference.type === 'value-list') {
            filePathSegments.push(reference.target);
        }

        filePathSegments.push('metadata.xml');
        const path = join(...filePathSegments);

        if (reference.metadata) {
            fs.write(path, prettifyXml(reference.metadata, { indent: INDENT_SIZE }));
        }
    }
}

/**
 * Builds relative service root for file system.
 *
 * @param mainServicePath - Path of the main service from which the external service reference originates.
 * @param pathWithParameters - Full path of the external service reference, possibly including parameters.
 * @returns Relative service root path.
 */
function getServiceRoot(mainServicePath: string, pathWithParameters: string): string {
    const [servicePath] = pathWithParameters.split(';');
    const segments = servicePath.split('/');
    let prefix = '/';
    let currentSegment = segments.shift();
    while (currentSegment !== undefined) {
        const next = joinPosix(prefix, currentSegment);
        if (!mainServicePath.startsWith(next)) {
            break;
        }
        prefix = next;
        currentSegment = segments.shift();
    }
    return servicePath.replace(prefix, '');
}

const DEFAULT_OPTIONS: ExternalServiceCollectionOptions = {
    valueListReferences: true,
    codeLists: true
};

/**
 * Fills missing parameters with defaults.
 *
 * @param options - Options for collecting external service references
 * @returns External service collection options with all values set.
 */
function getOptions(options?: Partial<ExternalServiceCollectionOptions>): ExternalServiceCollectionOptions {
    if (!options) {
        return {
            ...DEFAULT_OPTIONS
        };
    }
    return {
        valueListReferences: options.valueListReferences ?? DEFAULT_OPTIONS.valueListReferences,
        codeLists: options.codeLists ?? DEFAULT_OPTIONS.codeLists
    };
}

/**
 * Collects annotation values that reference external services from the given metadata and annotation files.
 *
 * @param serviceRootPath - The service path to which the value list references belong
 * @param metadata - The metadata of the service
 * @param annotations - The annotation files
 * @param options - Options for collecting external service references.
 * If not provided, all reference types are collected.
 * To disable the collection of a specific type, set its value to `false`.
 * @returns External service references found in the files.
 */
export function getExternalServiceReferences(
    serviceRootPath: string,
    metadata: ConvertedMetadata | RawSchema | string | undefined,
    annotations: { Definitions: string }[] = [],
    options?: Partial<ExternalServiceCollectionOptions>
): ExternalServiceReference[] {
    const finalOptions = getOptions(options);
    if (!metadata) {
        return [];
    }
    const files = [metadata, ...annotations.map((annotationFile) => annotationFile.Definitions)];

    const references: ExternalServiceReference[] = [];
    for (const data of files) {
        const schema = typeof data === 'string' ? convert(parse(data)) : data;
        for (const annotationLists of Object.values(schema.annotations)) {
            for (const annotationList of annotationLists) {
                const target = annotationList.target.replace(schema.namespace + '.', '');
                collectExternalServiceReferences(finalOptions, references, target, annotationList, serviceRootPath);
            }
        }
    }
    return references;
}

/**
 * Collects ValueListReference values from targets annotations.
 *
 * @param options - Options for collecting external service references
 * @param references - The collected value list references
 * @param target - The target of the annotation list
 * @param annotationList - The annotation list to be checked
 * @param serviceRootPath - The service path to which the value list references belong
 */
function collectExternalServiceReferences(
    options: ExternalServiceCollectionOptions,
    references: ExternalServiceReference[],
    target: string,
    annotationList: AnnotationList,
    serviceRootPath: string
): void {
    for (const annotation of annotationList.annotations) {
        collectValueListReferences(options, references, target, annotation, serviceRootPath);
        collectCodeLists(options, references, annotation, serviceRootPath);
    }
}

/**
 * Collects ValueListReferences annotations.
 *
 * @param options - Options for collecting external service references
 * @param references - The collected value list references
 * @param target - The target of the annotation list
 * @param annotation - The annotation to be checked
 * @param serviceRootPath - The service path to which the value list references belong
 */
function collectValueListReferences(
    options: ExternalServiceCollectionOptions,
    references: ExternalServiceReference[],
    target: string,
    annotation: RawAnnotation,
    serviceRootPath: string
): void {
    if (options.valueListReferences && annotation.term === 'com.sap.vocabularies.Common.v1.ValueListReferences') {
        for (const value of annotation.collection ?? []) {
            if (value.type === 'String') {
                const stringValue = value as StringExpression;
                references.push({
                    type: 'value-list',
                    serviceRootPath,
                    target,
                    value: stringValue.String
                });
            }
        }
    }
}

/**
 * Collects CodeList annotations.
 *
 * @param options - Options for collecting external service references
 * @param references - The collected value list references
 * @param annotation - The annotation to be checked
 * @param serviceRootPath - The service path to which the value list references belong
 */
function collectCodeLists(
    options: ExternalServiceCollectionOptions,
    references: ExternalServiceReference[],
    annotation: RawAnnotation,
    serviceRootPath: string
): void {
    if (
        options.codeLists &&
        (annotation.term === 'com.sap.vocabularies.CodeList.v1.CurrencyCodes' ||
            annotation.term === 'com.sap.vocabularies.CodeList.v1.UnitsOfMeasure') &&
        annotation.record
    ) {
        const collectionPath = getPropertyValue(annotation.record, 'CollectionPath');
        const url = getPropertyValue(annotation.record, 'Url');
        if (url) {
            references.push({
                type: 'code-list',
                serviceRootPath,
                value: url,
                collectionPath: collectionPath ?? undefined
            });
        }
    }
}

/**
 * Reads property value from annotation record.
 *
 * @param record - Annotation record
 * @param propertyName - Name of the property
 * @returns Value of the property if it exists
 */
function getPropertyValue(record: AnnotationRecord, propertyName: string): string | undefined {
    const property = record.propertyValues.find((prop) => prop.name === propertyName);
    if (property && property.value.type === 'String') {
        const value = property.value as StringExpression;
        return value.String;
    }
    return undefined;
}
