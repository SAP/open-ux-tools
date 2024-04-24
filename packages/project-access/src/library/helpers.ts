import { dirname, join } from 'path';
import { ui5Libs } from './constants';
import { ReuseLibType, type LibraryResults, type Manifest, type ReuseLib } from '../types';
import { findFiles } from '../file';
import { FileName } from '../constants';
import { existsSync, promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { getI18nPropertiesPaths } from '../project/i18n';
import { getPropertiesI18nBundle } from '@sap-ux/i18n';

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
    const parsedFile = new XMLParser({ removeNSPrefix: true }).parse(library, false);
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
                uri: parsedFile.library?.appData?.manifest?.['sap.platform.abap']?.uri || '',
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
            const libraryPaths = await findFiles('library.js', lib.projectRoot, excludeFolders);

            for (const manifestPath of manifestPaths) {
                const manifestFilePath = join(manifestPath, FileName.Manifest);
                const manifest = JSON.parse(await fs.readFile(manifestFilePath, { encoding: 'utf8' }));
                const library = await getLibraryFromManifest(manifest, manifestFilePath, reuseLibs, lib.projectRoot);
                if (library) {
                    reuseLibs.push(library);
                }
            }

            for (const libraryPath of libraryPaths) {
                const libraryFilePath = join(libraryPath, FileName.Library);
                const library = (await fs.readFile(libraryFilePath, { encoding: 'utf8' })).toString();

                const libFile = await getLibraryFromLibraryFile(library, libraryFilePath, lib.projectRoot);
                updateLibOptions(reuseLibs, libFile);
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
export async function getLibraryDesc(library: any, libraryPath: string): Promise<string> {
    let libraryDesc = library?.library?.documentation;
    if (typeof libraryDesc === 'string' && libraryDesc.startsWith('{{')) {
        const key = libraryDesc.substring(2, libraryDesc.length - 2);

        libraryDesc = await geti18nPropertyValue(
            join(dirname(libraryPath), library.library?.appData?.manifest?.i18n?.toString()),
            key
        );
    }
    return libraryDesc.toString();
}

/**
 * Returns the library dependencies.
 *
 * @param library - library object
 * @returns array of dependencies
 */
export function getLibraryDependencies(library: any): string[] {
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

    Object.values(['libs', 'components']).forEach((reuseType) => {
        const dependencies = (manifest['sap.ui5']?.dependencies as { [k: string]: any } | undefined)?.[reuseType];
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
