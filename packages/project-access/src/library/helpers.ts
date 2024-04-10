import { join } from 'path';
import { ui5Libs } from './constants';
import propertiesReader from 'properties-reader';
import type { LibraryResults, Manifest } from '../types';
import { ReuseLibType, type ReuseLibChoice, type ReuseLib } from './types';
import { findFiles } from '../file';
import { FileName } from '../constants';
import { existsSync, promises as fs } from 'fs';
import { XMLParser } from 'fast-xml-parser';

/**
 * Reads the manifest file and creates a library choice option.
 *
 * @param manifest - manifest file content
 * @param manifestPath - path to the manifest file
 * @param libraryChoiceOptions - existing library choice options
 * @param projectRoot - root of the project
 * @returns library choice option or undefined
 */
const getLibraryChoiceFromManifest = async (
    manifest: Manifest,
    manifestPath: string,
    libraryChoiceOptions: ReuseLibChoice[],
    projectRoot: string
): Promise<ReuseLibChoice | undefined> => {
    let reuseLibChoice;
    const manifestType = manifest['sap.app']?.type;
    if ((manifestType === 'component' || manifestType === 'library') && manifestPath) {
        const reuseType = getReuseType(manifestPath);
        const libDeps = getManifestDependencies(manifest);
        const libName = [manifest['sap.app'].id, reuseType, getManifestDesc(manifest, manifestPath)]
            .filter(Boolean)
            .join(' - ');
        const libIndex = libraryChoiceOptions.findIndex(
            (libChoice) => libChoice.value.name === manifest?.['sap.app'].id
        );
        if (libIndex === -1) {
            reuseLibChoice = {
                name: libName,
                value: {
                    name: `${manifest['sap.app'].id}`,
                    path: manifestPath,
                    type: reuseType,
                    uri: manifest['sap.platform.abap']?.uri ?? '',
                    dependencies: libDeps,
                    libRoot: projectRoot
                }
            };
        }
    }
    return reuseLibChoice;
};

/**
 * Reads library file and creates a library choice option.
 *
 * @param library - library file content
 * @param libraryPath - path to the library file
 * @param projectRoot - root of the project
 * @returns library choice option or undefined
 */
const getLibraryChoiceFromLibrary = async (
    library: string,
    libraryPath: string,
    projectRoot: string
): Promise<ReuseLibChoice | undefined> => {
    let libEntry;
    const parsedFile = new XMLParser({ removeNSPrefix: true }).parse(library, false);
    if (parsedFile?.library?.name) {
        const manifestType = parsedFile?.library ? 'library' : 'component';
        if (manifestType === 'component' || manifestType === 'library') {
            const reuseType = getReuseType(libraryPath);

            const libDeps = getLibraryDependencies(parsedFile);
            const libName = [parsedFile.library.name, reuseType, getLibraryDesc(parsedFile, libraryPath)]
                .filter(Boolean)
                .join(' - ');

            libEntry = {
                name: libName,
                value: {
                    name: `${parsedFile.library.name}`,
                    path: libraryPath,
                    type: reuseType,
                    uri: parsedFile.library?.appData?.manifest?.['sap.platform.abap']?.uri || '',
                    dependencies: libDeps,
                    libRoot: projectRoot
                }
            };
        }
    }
    return libEntry;
};

/**
 * Updates the library choice options with the new library choice.
 *
 * @param libraryChoiceOptions - existing library choice options
 * @param libraryChoice - new library choice
 */
const updateLibChoiceOptions = (libraryChoiceOptions: ReuseLibChoice[], libraryChoice?: ReuseLibChoice): void => {
    if (libraryChoice) {
        const libIndex = libraryChoiceOptions.findIndex((lib) => lib.value.name === libraryChoice.value.name);
        if (libIndex >= 0) {
            // replace
            libraryChoiceOptions[libIndex] = libraryChoice;
        } else {
            libraryChoiceOptions.push(libraryChoice);
        }
    }
};

/**
 * Creates the list choice options for the reuse libraries.
 *
 * @param libs - array of libraries found in the workspace folders.
 * @returns list of library choices
 */
export const getLibraryChoices = async (libs?: LibraryResults[]): Promise<ReuseLibChoice[]> => {
    const libraryChoiceOptions: ReuseLibChoice[] = [];

    if (libs) {
        for (const lib of libs) {
            const excludeFolders = ['.git', 'node_modules', 'dist'];
            const manifestPaths = await findFiles('manifest.json', lib.projectRoot, excludeFolders);
            const libraryPaths = await findFiles('library.js', lib.projectRoot, excludeFolders);

            for (const manifestPath of manifestPaths) {
                const manifest = JSON.parse(
                    await fs.readFile(join(manifestPath, FileName.Manifest), { encoding: 'utf8' })
                );
                const libraryChoice = await getLibraryChoiceFromManifest(
                    manifest,
                    manifestPath,
                    libraryChoiceOptions,
                    lib.projectRoot
                );
                if (libraryChoice) {
                    libraryChoiceOptions.push(libraryChoice);
                }
            }

            for (const libraryPath of libraryPaths) {
                const library = (
                    await fs.readFile(join(libraryPath, FileName.Library), { encoding: 'utf8' })
                ).toString();

                const libraryChoice = await getLibraryChoiceFromLibrary(library, libraryPath, lib.projectRoot);
                updateLibChoiceOptions(libraryChoiceOptions, libraryChoice);
            }
        }
    }
    return libraryChoiceOptions;
};

/**
 * Gets the type of reuse library.
 *
 * @param libraryPath - path to the reuse library
 * @returns the type of reuse library
 */
function getReuseType(libraryPath: string): ReuseLibType {
    return existsSync(join(libraryPath, '/library.js')) || existsSync(join(libraryPath, '/library.ts'))
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
 * @param projectPath - project path
 * @returns library description
 */
export function getLibraryDesc(library: any, projectPath: string): string {
    const libraryDesc = library?.library?.documentation;
    if (typeof libraryDesc === 'string' && libraryDesc.startsWith('{{')) {
        const desc = libraryDesc.replace(/(^{{)|(}}$)/g, '');
        return getI18nProperty(
            join(projectPath, library.library?.appData?.manifest?.i18n?.toString()),
            desc
        ).toString();
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
 * Returns the i18n property.
 *
 * @param i18nPath - i18n path
 * @param property - property name
 * @returns i18n property
 */
function getI18nProperty(i18nPath: string, property: string): string {
    try {
        const libProperties = propertiesReader(i18nPath);
        return libProperties.get(property)?.toString() || '';
    } catch (e) {
        return '';
    }
}

/**
 * Returns the manifest description.
 *
 * @param manifest - manifest object
 * @param projectPath - project path
 * @returns manifest description
 */
export function getManifestDesc(manifest: Manifest, projectPath: string): string {
    const manifestDesc = manifest['sap.app']?.description;
    if (typeof manifestDesc === 'string' && manifestDesc.startsWith('{{')) {
        const desc = manifestDesc.replace(/(^{{)|(}}$)/g, '');
        return getI18nProperty(join(projectPath, manifest['sap.app']?.i18n?.toString()), desc).toString();
    }

    return (manifestDesc || '').toString();
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
        if (manifest['sap.ui5']?.dependencies?.[reuseType]) {
            Object.keys(manifest['sap.ui5'].dependencies['libs']).forEach((manifestLibKey) => {
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
    });

    return result;
}
