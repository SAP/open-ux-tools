import { fileURLToPath, pathToFileURL } from 'url';
import { isAbsolute, join, relative } from 'path';
import { platform } from 'os';

import type {
    AliasInformation,
    AnnotationFile,
    Element,
    PathValue,
    Reference,
    Target as AnnotationFileTarget,
    TextNode,
    MetadataElement
} from '@sap-ux/odata-annotation-core-types';
import { ELEMENT_TYPE, Edm, GHOST_FILENAME_PREFIX, TEXT_TYPE } from '@sap-ux/odata-annotation-core-types';
import {
    getElementAttributeValue,
    getPathBaseMetadataElement,
    getSegmentWithoutAlias
} from '@sap-ux/odata-annotation-core';
import type { MetadataService } from '@sap-ux/odata-entity-model';

import { ApiError, ApiErrorCode } from '../error';
import type { Document } from './document';
import type { ProjectInfo } from '../types';
import { toUnifiedUri } from './utils';

function buildDefinitionIndex(
    metadataService: MetadataService,
    files: AnnotationFile[]
): { definitionIndex: Map<string, string[]>; virtualProperties: Map<string, string> } {
    /**
     * Mapping annotation path to file uri where the annotation is defined
     */
    const definitionIndex = new Map<string, string[]>();
    const virtualProperties = new Map<string, string>();

    for (const file of files) {
        for (const target of file.targets) {
            const metadataElement = metadataService.getMetadataElement(target.name);
            if (!metadataElement) {
                continue;
            }
            buildDefinitionIndexForTarget(definitionIndex, virtualProperties, metadataElement, target, file.uri);
        }
    }
    return { definitionIndex, virtualProperties };
}

function buildDefinitionIndexForTarget(
    definitionIndex: Map<string, string[]>,
    virtualProperties: Map<string, string>,
    metadataElement: MetadataElement,
    target: AnnotationFileTarget,
    fileUri: string
): void {
    for (const annotation of target.terms) {
        const qualifier = annotation.attributes[Edm.Qualifier]?.value;
        const termName = annotation.attributes[Edm.Term].value;
        const suffix = qualifier ? `#${qualifier}` : '';
        const path = `${metadataElement.path}/@${termName}${suffix}`;
        if (annotation.range) {
            // only consider previously existing annotations
            registerReference(definitionIndex, fileUri, path);
            collectAnnotations(definitionIndex, fileUri, path, annotation);
            if (termName === 'Analytics.AggregatedProperties') {
                const collection = annotation.content.find(
                    (element): element is Element => element.type === ELEMENT_TYPE && element.name === Edm.Collection
                );
                if (!collection) {
                    continue;
                }
                collectVirtualProperties(virtualProperties, fileUri, metadataElement, collection);
            }
        }
    }
}

function collectVirtualProperties(
    virtualProperties: Map<string, string>,
    fileUri: string,
    metadataElement: MetadataElement,
    collection: Element
): void {
    for (const record of collection.content) {
        if (record.type === ELEMENT_TYPE && record.name === Edm.Record) {
            const nameElement = record.content.find(
                (element): element is Element =>
                    element.type === ELEMENT_TYPE &&
                    element.name === Edm.PropertyValue &&
                    element.attributes[Edm.Property]?.value === 'Name'
            );
            if (nameElement) {
                const valueElement = nameElement.content.find(
                    (element): element is Element => element.type === ELEMENT_TYPE && element.name === Edm.String
                );
                if (valueElement) {
                    const textNode = valueElement.content.find(
                        (element): element is TextNode => element.type === TEXT_TYPE
                    );
                    virtualProperties.set(`${metadataElement.path}/${textNode?.text}`, fileUri);
                }
            }
        }
    }
}

function collectAnnotations(
    definitionIndex: Map<string, string[]>,
    fileUri: string,
    prefix: string,
    element: Element
): void {
    for (const child of element.content) {
        if (child.type !== 'element') {
            continue;
        }
        if (child.name === Edm.Annotation) {
            traverseAnnotation(definitionIndex, fileUri, prefix, child);
        } else if (child.name === Edm.Record) {
            traverseRecord(definitionIndex, fileUri, prefix, child);
        } else if (child.name === Edm.Collection) {
            traverseCollection(definitionIndex, fileUri, prefix, child);
        }
    }
}

function traverseCollection(
    definitionIndex: Map<string, string[]>,
    fileUri: string,
    prefix: string,
    collection: Element
): void {
    const elements = collection.content.filter((node): node is Element => node.type === ELEMENT_TYPE);
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const path = `${prefix}/${i.toString()}`;
        if (element.range) {
            // only consider previously existing annotations
            registerReference(definitionIndex, fileUri, path);
            for (const grandChild of element.content) {
                if (grandChild.type === 'element') {
                    collectAnnotations(definitionIndex, fileUri, path, grandChild);
                }
            }
        }
    }
}

function traverseRecord(
    definitionIndex: Map<string, string[]>,
    fileUri: string,
    prefix: string,
    element: Element
): void {
    for (const property of element.content) {
        if (property.type !== 'element' || property.name !== Edm.PropertyValue) {
            continue;
        }
        const name = property.attributes[Edm.Property]?.value;
        const suffix = name ?? '';
        const path = `${prefix}/${suffix}`;
        if (element.range) {
            // only consider previously existing annotations
            registerReference(definitionIndex, fileUri, path);
            for (const grandChild of property.content) {
                if (grandChild.type === 'element') {
                    collectAnnotations(definitionIndex, fileUri, path, grandChild);
                }
            }
        }
    }
}

function traverseAnnotation(
    definitionIndex: Map<string, string[]>,
    fileUri: string,
    prefix: string,
    element: Element
): void {
    const qualifier = element.attributes[Edm.Qualifier]?.value;
    const suffix = qualifier ? `#${qualifier}` : '';
    const path = `${prefix}@${element.attributes[Edm.Term].value}${suffix}`;
    if (element.range) {
        // only consider previously existing annotations
        registerReference(definitionIndex, fileUri, path);
        collectAnnotations(definitionIndex, fileUri, path, element);
    }
}

function registerReference(definitionIndex: Map<string, string[]>, fileUri: string, path: string): void {
    const entry = definitionIndex.get(path);
    // We can't point to ghost files, we need to use the real url
    const normalizedUri = fileUri.startsWith(GHOST_FILENAME_PREFIX) ? fileUri.substring(1) : fileUri;
    if (entry) {
        entry.push(normalizedUri);
    } else {
        definitionIndex.set(path, [normalizedUri]);
    }
}

function getPathsInElement(element: Element, basePath: string): { path: string }[] {
    const paths: { path: string }[] = [];
    // add all paths in attributes
    Object.keys(element.attributes || {}).forEach((attrName) => {
        if (attrName.indexOf('Path') >= 0) {
            let path = element.attributes[attrName].value;
            if (!path.startsWith('/')) {
                path = basePath + '/' + path;
            }
            paths.push({ path });
        }
    });
    // add all paths from content
    (element.content || []).forEach((entry) => {
        if (entry.type === 'text' && element.name.indexOf('Path') >= 0) {
            let path = entry.text;
            if (!path.startsWith('/')) {
                path = basePath + '/' + path;
            }
            paths.push({ path });
        } else if (entry.type === 'element') {
            paths.push(...getPathsInElement(entry, basePath));
        }
    });
    return paths;
}

function getPathsInTarget(
    target: AnnotationFileTarget,
    metadata: MetadataService,
    aliasInfo: AliasInformation
): { path: string; forOverriding?: boolean }[] {
    const paths: { path: string; forOverriding?: boolean }[] = [];
    paths.push({ path: target.name });
    // find base path (for relative paths in annotation value) for target
    const pathBaseMdElement = getPathBaseMetadataElement(metadata, target.name, aliasInfo);
    const pathBase = pathBaseMdElement?.path ?? target.name;
    target.terms.forEach((term) => {
        getPathsInAnnotation(term, paths, target.name, pathBase);
    });

    return paths;
}

function getPathsInAnnotation(
    element: Element,
    paths: { path: string; forOverriding?: boolean }[],
    targetName: string,
    pathBase: string
): void {
    // new target term qualifier combination in this file ? then avoid duplicates in unrelated layers!
    const termName = getElementAttributeValue(element, Edm.Term);
    const qualifier = getElementAttributeValue(element, Edm.Qualifier);

    // new target/term/qualifier: add path pointing to this term, then using statement will be created if this combination exists elsewhere
    paths.push({
        path: targetName + '/@' + termName + (qualifier ? '#' + qualifier : ''),
        forOverriding: true
    });
    paths.push(...getPathsInElement(element, pathBase));
}

function addAvailableNamespaces(
    fileUri: string,
    namespaceMap: Map<string, Reference>,
    projectRoot: string,
    documents: Map<string, Document>,
    fileUrisDone: Set<string> = new Set()
): void {
    if (!fileUrisDone.has(fileUri)) {
        fileUrisDone.add(fileUri);
        let filePath = pathToFileURL(join(projectRoot, fileUri)).toString();
        if (platform() === 'win32' && !documents.has(filePath)) {
            // we can't find the document by uri, it is likely that the drive letter case does not match
            // temporary workaround, this should not be needed once URIs are used everywhere
            let driveLetter = filePath[8];
            if (driveLetter === driveLetter.toLowerCase()) {
                driveLetter = driveLetter.toUpperCase();
            } else {
                driveLetter = driveLetter.toLowerCase();
            }
            filePath = filePath.slice(0, 8) + driveLetter + filePath.slice(9);
        }
        const annotationFileInternal = documents.get(filePath)?.annotationFile;
        if (annotationFileInternal) {
            const references = annotationFileInternal.references;
            references
                .filter((reference) => !!reference?.uri)
                .forEach((reference: Reference) => {
                    const refUri = reference?.uri;
                    if (refUri) {
                        const relativeString = relative(projectRoot, refUri);
                        namespaceMap.set(reference.name + '|' + relativeString, {
                            uri: refUri,
                            name: reference.name,
                            type: 'reference'
                        });
                        addAvailableNamespaces(relativeString, namespaceMap, projectRoot, documents, fileUrisDone);
                    }
                });
        }
    }
}

/**
 *
 * @param projectRoot - Absolute path to the projects root.
 * @param references - Reference objects.
 * @param relativePath - Relative file path to be checked.
 * @param name - Name of the imported object.
 * @returns If the given reference is available in the document.
 */
export const isAvailable = (
    projectRoot: string,
    references: Reference[],
    relativePath?: string,
    name?: string
): boolean => {
    const matchedReferences = references.filter((reference) => {
        let absoluteUri = join(projectRoot, relativePath ?? '');
        if (absoluteUri && process.platform === 'win32') {
            absoluteUri = absoluteUri.charAt(0).toUpperCase() + absoluteUri.slice(1);
        }
        if (!reference.uri || reference.uri !== absoluteUri) {
            return false; // different file
        } else if (reference.name && name && !name.startsWith(reference.name)) {
            return false; // imported namespace does not include requested name
        } else {
            return true;
        }
    });
    return matchedReferences.length > 0;
};

/**
 * Converts path to namespace qualified path.
 *
 * @param path - Input path value.
 * @param aliasInfo - Documents alias information.
 * @returns Namespace qualified path.
 */
export function resolvePath(path: PathValue, aliasInfo: AliasInformation): PathValue {
    const segments = path.split('/');
    const segmentsNoAlias = segments.map((segment) => getSegmentWithoutAlias(aliasInfo, segment));
    return segmentsNoAlias.join('/');
}

function checkSegments(
    fileUri: string,
    references: Reference[],
    missingReferences: Set<string>,
    segments: string[],
    metadataService: MetadataService,
    projectRoot: string
): string | undefined {
    let currentMdElementPath: string | undefined;
    for (const segment of segments) {
        let metadataElement: MetadataElement | undefined = metadataService.getMetadataElement(segment);
        if (currentMdElementPath) {
            metadataElement = metadataService.getMetadataElement(currentMdElementPath + '/' + segment);
        }
        if (!metadataElement) {
            break;
        }
        currentMdElementPath = metadataElement.path;
        const importUri = metadataElement.importUri;
        if (
            ![fileUri, undefined].includes(importUri) &&
            !isAvailable(projectRoot, references, metadataElement?.importUri, metadataElement.originalName)
        ) {
            missingReferences.add(importUri as string);
        }
        if (metadataService.getEdmTargetKinds(currentMdElementPath).includes('NavigationProperty')) {
            // navigation property : continue with target entity
            const structuredType = metadataElement?.structuredType;
            currentMdElementPath = structuredType ? metadataService.getMetadataElement(structuredType)?.path : '';
        }
    }
    return currentMdElementPath;
}

function checkMetadataDefinitions(
    fileUri: string,
    aliasInfo: AliasInformation,
    references: Reference[],
    missingReferences: Set<string>,
    virtualProperties: Map<string, string>,
    entry: { path: string; forOverriding?: boolean },
    metadataService: MetadataService,
    projectRoot: string
): string | undefined {
    const atIndex = entry.path.indexOf('@');
    // check path segments involving only metadata
    const metadataPath = atIndex >= 0 ? entry.path.substring(0, Math.max(0, atIndex - 1)) : entry.path;

    const fullyQualifiedPath = resolvePath(metadataPath, aliasInfo);
    const metadataSegments = fullyQualifiedPath.split('/');

    const virtualPropertyUri = virtualProperties.get(fullyQualifiedPath);
    if (
        virtualPropertyUri &&
        !isAvailable(
            projectRoot,
            references,
            relative(projectRoot, fileURLToPath(virtualPropertyUri)),
            fullyQualifiedPath
        )
    ) {
        missingReferences.add(virtualPropertyUri);
    }

    const currentMdElementPath = checkSegments(
        fileUri,
        references,
        missingReferences,
        metadataSegments,
        metadataService,
        projectRoot
    );
    let result;
    if (atIndex !== -1) {
        const termCast = entry.path.slice(atIndex - 1);
        const target = entry.forOverriding ? fullyQualifiedPath : currentMdElementPath;
        result = `${target}${termCast}`;
    }
    return result;
}

/**
 * Get all missing references for target and its annotations.
 *
 * @param documents - URI to Document map.
 * @param fileUri - Identification of current file (relative to project root).
 * @param targetName - Annotation target name.
 * @param targetOrElement - Internal representation of the target or subtree element.
 * @param aliasInfo - Alias information for the document.
 * @param metadataService - Metadata service.
 * @param projectInfo - Data about applications in the project.
 * @returns A set of missing references in the document.
 */
export function getMissingRefs(
    documents: Map<string, Document>,
    fileUri: string,
    targetName: string,
    targetOrElement: AnnotationFileTarget | Element,
    aliasInfo: AliasInformation,
    metadataService: MetadataService,
    projectInfo: ProjectInfo
): Set<string> {
    const relativePath = relative(projectInfo.projectRoot, fileURLToPath(fileUri));
    const { appName, apps, projectRoot } = projectInfo;
    const missingReferences: Set<string> = new Set();
    // get all paths contained in target and its annotations
    let paths: { path: string; forOverriding?: boolean }[] = [];
    if (targetOrElement.type === 'target') {
        paths = getPathsInTarget(targetOrElement, metadataService, aliasInfo);
    } else {
        const pathBaseMdElement = getPathBaseMetadataElement(metadataService, targetName, aliasInfo);
        const pathBase = pathBaseMdElement?.path ?? targetName;
        if (targetOrElement.name === Edm.Annotation) {
            getPathsInAnnotation(targetOrElement, paths, targetName, pathBase);
        } else {
            paths = getPathsInElement(targetOrElement, pathBase);
        }
    }

    // get all namespaces available for current file
    const nameSpacesMap: Map<string, Reference> = new Map();
    addAvailableNamespaces(relativePath, nameSpacesMap, projectRoot, documents);
    const references = [...nameSpacesMap.values()];

    const annotationFiles = [...documents].map(([, document]) => document.annotationFile).reverse();
    const { definitionIndex, virtualProperties } = buildDefinitionIndex(metadataService, annotationFiles);
    for (const entry of paths) {
        const annotationPath = checkMetadataDefinitions(
            relativePath,
            aliasInfo,
            references,
            missingReferences,
            virtualProperties,
            entry,
            metadataService,
            projectRoot
        );
        const uris = findDefinitionForEntry(projectRoot, definitionIndex, annotationPath);

        const addToMissing = hasMissingUri(uris, relativePath, references, projectRoot);
        // if not: collect as missing using statement
        if (!addToMissing) {
            continue;
        }

        const missingUri = uris[0];
        const unifiedMissingUri = toUnifiedUri(missingUri);
        const crossAppFolder = getCrossAppFolder(unifiedMissingUri, appName, apps);

        if (crossAppFolder && entry.forOverriding) {
            // cross app using statement needed for overriding annotation: this will most likely cause cds compiler error -> throw exception
            const message = `Aborted to avoid cross app using statement in '${relativePath}' pointing to '${crossAppFolder}'`;
            throw new ApiError(message, ApiErrorCode.General);
        }
        if (!crossAppFolder) {
            // no cross app using statements allowed - ignore missing reference required for referenced path in annotation (we tolerate potential warning message)
            missingReferences.add(missingUri);
        }
    }
    return missingReferences;
}

function findDefinitionForEntry(
    projectRoot: string,
    definitionIndex: Map<string, string[]>,
    annotationPath: string | undefined
): string[] {
    const uris: string[] = [];
    if (annotationPath) {
        const references = definitionIndex.get(annotationPath);
        if (references) {
            const relativePath = relative(projectRoot, fileURLToPath(references[0]));
            uris.push(relativePath);
        }
    }
    return uris;
}

function getCrossAppFolder(uri: string, appName: string, apps: string[]): string {
    let crossAppFolder = '';
    if (!isSubDirectory(toUnifiedUri(`${appName}/`), uri)) {
        (apps || []).forEach((appFolder) => {
            if (isSubDirectory(toUnifiedUri(`${appFolder}/`), uri)) {
                crossAppFolder = appFolder;
            }
        });
    }
    return crossAppFolder;
}

function isSubDirectory(parent: string, child: string): boolean {
    const relativePath = relative(parent, child);
    return !!(relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function hasMissingUri(uris: string[], fileUri: string, references: Reference[], projectRoot: string) {
    if (uris.length === 0) {
        return false;
    }
    for (const uri of uris) {
        if (uri === fileUri || isAvailable(projectRoot, references, uri)) {
            return false;
        }
    }
    return true;
}
