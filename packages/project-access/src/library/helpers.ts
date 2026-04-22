import { dirname, join } from 'node:path';
import { ui5Libs } from './constants';
import {
    ReuseLibType,
    type LibraryResults,
    type Manifest,
    type ManifestNamespace,
    type ReuseLib,
    type LibraryXml
} from '../types';
import { findFiles, findFilesByExtension, readJSON } from '../file';
import { FileName } from '../constants';
import { existsSync, promises as fs } from 'node:fs';
import { XMLParser } from 'fast-xml-parser';
import { getI18nPropertiesPaths } from '../project/i18n';
import { getPropertiesI18nBundle } from '@sap-ux/i18n';
import type { Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';

/**
 * Reads the manifest file and returns the reuse library.
 *
 * @param manifest - manifest file content
 * @param manifestPath - path to the manifest file
 * @param reuseLibs - existing reuse libraries
 * @param projectRoot - root of the project
 * @returns reuse library or undefined
 */
const getLibraryFromManifest = async (
    manifest: Manifest,
    manifestPath: string,
    reuseLibs: ReuseLib[],
    projectRoot: string
): Promise<ReuseLib | undefined> => {
    let reuseLib;
    const manifestType = manifest['sap.app']?.type;
    if ((manifestType === 'component' || manifestType === 'library') && manifestPath) {
        const reuseType = getReuseType(manifestPath);
        const libDeps = getManifestDependencies(manifest);
        const description = await getManifestDesc(manifest, manifestPath);

        const libIndex = reuseLibs.findIndex((reuseLib) => reuseLib.name === manifest?.['sap.app'].id);
        if (libIndex === -1) {
            reuseLib = {
                name: `${manifest['sap.app'].id}`,
                path: dirname(manifestPath),
                type: reuseType,
                uri: manifest['sap.platform.abap']?.uri ?? '',
                dependencies: libDeps,
                libRoot: projectRoot,
                description
            };
        }
    }

    return reuseLib;
};

/**
 * Reads library file and returns a reuse lib object.
 *
 * @param library - library file content
 * @param libraryPath - path to the library file
 * @param projectRoot - root of the project
 * @returns reuse library or undefined
 */
const getLibraryFromLibraryFile = async (
    library: string,
    libraryPath: string,
    projectRoot: string
): Promise<ReuseLib | undefined> => {
    let libEntry;
    const parsedFile = new XMLParser({ removeNSPrefix: true }).parse(library, false) as LibraryXml;
    if (parsedFile?.library?.name) {
        const manifestType = parsedFile?.library ? 'library' : 'component';
        if (manifestType === 'component' || manifestType === 'library') {
            const reuseType = getReuseType(libraryPath);
            const libDeps = getLibraryDependencies(parsedFile);
            const description = await getLibraryDesc(parsedFile, libraryPath);
            libEntry = {
                name: `${parsedFile.library.name}`,
                path: dirname(libraryPath),
                type: reuseType,
                uri: parsedFile.library?.appData?.manifest?.['sap.platform.abap']?.uri ?? '',
                dependencies: libDeps,
                libRoot: projectRoot,
                description
            };
        }
    }

    return libEntry;
};

/**
 * Updates the library options with the new library.
 *
 * @param reuseLibs - existing library options
 * @param reuseLib - new library
 */
const updateLibOptions = (reuseLibs: ReuseLib[], reuseLib?: ReuseLib): void => {
    if (reuseLib) {
        const libIndex = reuseLibs.findIndex((lib) => lib.name === reuseLib.name);
        if (libIndex >= 0) {
            // replace
            reuseLibs[libIndex] = reuseLib;
        } else {
            reuseLibs.push(reuseLib);
        }
    }
};

/**
 * Returns an array of the reuse libraries found in the folders.
 *
 * @param libs - array of libraries found in the workspace folders.
 * @returns list of reuse library
 */
export const getReuseLibs = async (libs?: LibraryResults[]): Promise<ReuseLib[]> => {
    const reuseLibs: ReuseLib[] = [];

    if (libs) {
        for (const lib of libs) {
            const excludeFolders = ['.git', 'node_modules', 'dist'];
            const manifestPaths = await findFiles('manifest.json', lib.projectRoot, excludeFolders);
            const libraryPaths = [
                ...(await findFiles('library.js', lib.projectRoot, excludeFolders)),
                ...(await findFiles('library.ts', lib.projectRoot, excludeFolders))
            ];

            for (const manifestPath of manifestPaths) {
                const manifestFilePath = join(manifestPath, FileName.Manifest);
                const manifest = await readJSON<Manifest>(manifestFilePath);
                const library = await getLibraryFromManifest(manifest, manifestFilePath, reuseLibs, lib.projectRoot);
                if (library) {
                    reuseLibs.push(library);
                }
            }

            for (const libraryPath of libraryPaths) {
                try {
                    const libraryFilePath = join(libraryPath, FileName.Library);
                    const library = (await fs.readFile(libraryFilePath, { encoding: 'utf8' })).toString();
                    const libFile = await getLibraryFromLibraryFile(library, libraryFilePath, lib.projectRoot);
                    updateLibOptions(reuseLibs, libFile);
                } catch {
                    // ignore exception
                }
            }
        }
    }
    return reuseLibs;
};

/**
 * Gets the type of reuse library.
 *
 * @param libraryPath - path to the reuse library
 * @returns the type of reuse library
 */
function getReuseType(libraryPath: string): ReuseLibType {
    return existsSync(join(dirname(libraryPath), '/library.js')) ||
        existsSync(join(dirname(libraryPath), '/library.ts'))
        ? ReuseLibType.Library
        : ReuseLibType.Component;
}

/**
 * Checks for missing dependencies in the selected reuse libraries.
 *
 * @param answers - reuse libraries selected by the user
 * @param reuseLibs - all available reuse libraries
 * @returns a string with the missing dependencies
 */
export function checkDependencies(answers: ReuseLib[], reuseLibs: ReuseLib[]): string {
    const missingDeps: string[] = [];
    answers.forEach((answer) => {
        const dependencies = answer.dependencies;
        if (dependencies?.length) {
            dependencies.forEach((dependency) => {
                if (
                    !reuseLibs.some((lib) => {
                        return dependency === lib.name;
                    })
                ) {
                    missingDeps.push(dependency);
                }
            });
        }
    });
    return missingDeps.join();
}

/**
 * Returns the library description.
 *
 * @param library - library object
 * @param libraryPath - library path
 * @returns library description
 */
export async function getLibraryDesc(library: LibraryXml, libraryPath: string): Promise<string> {
    let libraryDesc = library?.library?.documentation;
    if (typeof libraryDesc === 'string' && libraryDesc.startsWith('{{')) {
        const key = libraryDesc.substring(2, libraryDesc.length - 2);

        libraryDesc = await geti18nPropertyValue(
            join(dirname(libraryPath), library.library?.appData?.manifest?.i18n?.toString() ?? ''),
            key
        );
    }
    return libraryDesc?.toString() ?? '';
}

/**
 * Returns the library dependencies.
 *
 * @param library - library object
 * @returns array of dependencies
 */
export function getLibraryDependencies(library: LibraryXml): string[] {
    const result: string[] = [];
    if (library?.library?.dependencies?.dependency) {
        let deps = library.library.dependencies.dependency;
        if (!Array.isArray(deps)) {
            deps = [deps];
        }
        deps.forEach((lib: { libraryName: string }) => {
            // ignore libs that start with SAPUI5 delivered namespaces
            if (
                !ui5Libs.some((substring) => {
                    return lib.libraryName === substring || lib.libraryName.startsWith(substring + '.');
                })
            ) {
                result.push(lib.libraryName);
            }
        });
    }
    return result;
}

/**
 * Returns the i18n property value.
 *
 * @param i18nPath - i18n path
 * @param key - property key
 * @returns i18n property value
 */
async function geti18nPropertyValue(i18nPath: string, key: string): Promise<string> {
    let value = '';
    try {
        const bundle = await getPropertiesI18nBundle(i18nPath);
        const node = bundle[key].find((i) => i.key.value === key);
        if (node) {
            value = node.value.value;
        }
    } catch (e) {
        // ignore exception
    }
    return value;
}

/**
 * Returns the manifest description.
 *
 * @param manifest - manifest object
 * @param manifestPath - manifestPath path
 * @returns manifest description
 */
export async function getManifestDesc(manifest: Manifest, manifestPath: string): Promise<string> {
    let manifestDesc = manifest['sap.app']?.description;

    if (typeof manifestDesc === 'string' && manifestDesc.startsWith('{{')) {
        const key = manifestDesc.substring(2, manifestDesc.length - 2);

        const { 'sap.app': i18nPath } = await getI18nPropertiesPaths(manifestPath, manifest);
        manifestDesc = await geti18nPropertyValue(i18nPath, key);
    }

    return (manifestDesc ?? '').toString();
}

/**
 * Returns the manifest dependencies.
 *
 * @param manifest - manifest object
 * @returns array of dependencies
 */
export function getManifestDependencies(manifest: Manifest): string[] {
    const result: string[] = [];
    const depTypes: (keyof ManifestNamespace.JSONSchemaForSAPUI5Namespace['dependencies'])[] = ['libs', 'components'];
    Object.values(depTypes).forEach((reuseType) => {
        const dependencies = manifest['sap.ui5']?.dependencies?.[reuseType];
        if (dependencies) {
            const libs = manifest?.['sap.ui5']?.dependencies?.libs;
            if (libs) {
                Object.keys(libs).forEach((manifestLibKey) => {
                    // ignore libs that start with SAPUI5 delivered namespaces
                    if (
                        !ui5Libs.some((substring) => {
                            return manifestLibKey === substring || manifestLibKey.startsWith(substring + '.');
                        })
                    ) {
                        result.push(manifestLibKey);
                    }
                });
            }
        }
    });

    return result;
}

/**
 * Validates if an id is unique across XML files (fragments and views) in the project.
 * Synchronous overload - when files are provided directly.
 *
 * @param baseId - id to validate
 * @param validatedIds - array of ids that are already validated/used
 * @param options - validation options with files array
 * @param options.files - array of XML file contents to check
 * @param options.appPath - must be undefined for synchronous overload
 * @param options.memFs - must be undefined for synchronous overload
 * @returns true if the id is unique (available), false if it already exists
 */
export function validateId(
    baseId: string,
    validatedIds: string[] | undefined,
    options: { files: string[]; appPath?: never; memFs?: never }
): boolean;

/**
 * Validates if an id is unique across XML files (fragments and views) in the project.
 * Asynchronous overload - when appPath is provided (requires file system access).
 *
 * @param baseId - id to validate
 * @param validatedIds - array of ids that are already validated/used
 * @param options - validation options with appPath
 * @param options.files - must be undefined for asynchronous overload
 * @param options.appPath - path to search for XML files
 * @param options.memFs - optional mem-fs-editor instance for reading files
 * @returns Promise that resolves to true if the id is unique (available), false if it already exists
 */
export function validateId(
    baseId: string,
    validatedIds: string[] | undefined,
    options: { files?: never; appPath: string; memFs?: Editor }
): Promise<boolean>;

/**
 * Validates if an id is unique across XML files (fragments and views) in the project.
 * Asynchronous overload - when no options are provided.
 *
 * @param baseId - id to validate
 * @param validatedIds - array of ids that are already validated/used
 * @param options - undefined (no validation options)
 * @returns Promise that resolves to true (always valid when no files to check)
 */
export function validateId(baseId: string, validatedIds?: string[], options?: undefined): Promise<boolean>;

// Implementation
export function validateId(
    baseId: string,
    validatedIds?: string[],
    options?: { files?: string[]; appPath?: string; memFs?: Editor }
): boolean | Promise<boolean> {
    const { memFs, appPath, files: fileContents } = options ?? {};

    /**
     * Checks if an element with the specified id is available (does not exist) in the XML content.
     *
     * @param id - id to check for availability
     * @param xmlContent - XML content as string
     * @returns true if the id is available (not found), false if it exists
     */
    function checkElementIdAvailable(id: string, xmlContent: string): boolean {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            parseAttributeValue: false
        });

        try {
            const xmlDocument: unknown = parser.parse(xmlContent);
            return xmlDocument ? !hasElementWithId(xmlDocument, id) : true;
        } catch {
            // Parse error = no valid document = no element with id
            return true;
        }
    }

    /**
     * Checks if a value (object or array) contains an element with the specified id.
     *
     * @param value - value to check (can be array or object)
     * @param id - id to search for
     * @param attrPrefix - attribute prefix used by the parser
     * @returns true if id is found in the value
     */
    function checkIdInValue(value: unknown, id: string, attrPrefix: string): boolean {
        if (Array.isArray(value)) {
            return value.some((item) => hasElementWithId(item, id, attrPrefix));
        }
        if (typeof value === 'object' && value !== null) {
            return hasElementWithId(value, id, attrPrefix);
        }
        return false;
    }

    /**
     * Recursively searches for an element with the specified id attribute in a parsed XML object.
     *
     * @param obj - parsed XML object to search in
     * @param id - id attribute value to search for
     * @param attrPrefix - attribute prefix used by the parser (default: '@_')
     * @returns true if an element with the specified id is found
     */
    function hasElementWithId(obj: unknown, id: string, attrPrefix: string = '@_'): boolean {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        const objRecord = obj as Record<string, unknown>;

        // Check if current object has the id attribute
        if (objRecord[`${attrPrefix}id`] === id) {
            return true;
        }

        // Recursively search in all properties
        for (const key in objRecord) {
            if (key.startsWith(attrPrefix)) {
                continue; // Skip attributes
            }

            if (checkIdInValue(objRecord[key], id, attrPrefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validates the ID against the provided files.
     *
     * @param files - array of XML file contents to validate against
     * @returns true if the id is unique (available), false if it already exists
     */
    function validateAgainstFiles(files: string[]): boolean {
        return (
            files.every((content) => content === '' || checkElementIdAvailable(baseId, content)) &&
            !validatedIds?.includes(baseId)
        );
    }

    // Synchronous path: when files are provided directly
    if (fileContents !== undefined) {
        return validateAgainstFiles(fileContents);
    }

    // Asynchronous path: when appPath is provided or no options
    return (async (): Promise<boolean> => {
        let files: string[] | undefined;
        if (appPath) {
            // Ensure we have a memFs instance
            const fsEditor = memFs ?? create(createStorage());

            const xmlFilePaths = await findFilesByExtension(
                '.xml',
                appPath,
                ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                fsEditor
            );
            const lookupFiles = ['.fragment.xml', '.view.xml'];
            const filteredPaths = xmlFilePaths.filter((fileName: string) =>
                lookupFiles.some((lookupFile) => fileName.endsWith(lookupFile))
            );

            // Read file contents from paths using memFs
            files = filteredPaths.map((path: string) => fsEditor.read(path));
        }

        if (files) {
            return validateAgainstFiles(files);
        }
        return true;
    })();
}
