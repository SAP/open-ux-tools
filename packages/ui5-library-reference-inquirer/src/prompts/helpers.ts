import {
    FileName,
    getLibraryDependencies,
    getLibraryDesc,
    getManifestDependencies,
    getManifestDesc,
    type Manifest,
    type AllAppResults,
    type LibraryResults
} from '@sap-ux/project-access';
import { hasDependency } from '@sap-ux/project-access/dist/project/dependencies';
import { existsSync, promises as fs } from 'fs';
import type { ListChoiceOptions, Question } from 'inquirer';
import { join, basename } from 'path';
import type {
    CommonPromptOptions,
    promptNames,
    ReuseLib,
    ReuseLibChoice,
    UI5LibraryReferenceAnswers,
    UI5LibraryReferencePromptOptions,
    UI5LibraryReferenceQuestion
} from '../types';
import { ReuseLibType } from '../types';
import { XMLParser } from 'fast-xml-parser';
import { extendAdditionalMessages, type validate, type YUIQuestion } from '@sap-ux/inquirer-common';
import { findFiles } from '@sap-ux/project-access/dist/file';

/**
 * Filters the apps that have @sap/ux-ui5-tooling as a dependency and creates the list choice options.
 *
 * @param apps array of applications found in the workspace folders.
 * @returns list of projects
 */
export const getProjectChoices = async (apps?: AllAppResults[]): Promise<ListChoiceOptions[]> => {
    const projectChoices: ListChoiceOptions[] = [];

    if (apps) {
        for (const app of apps) {
            try {
                const pkgJsonPath = join(app.appRoot, FileName.Package);
                const packageJson = JSON.parse(await fs.readFile(pkgJsonPath, { encoding: 'utf8' }));

                if (hasDependency(packageJson, '@sap/ux-ui5-tooling')) {
                    const name = basename(app.appRoot);
                    projectChoices.push({ name, value: { folderName: name, path: app.appRoot } });
                }
            } catch {
                // do nothing
            }
        }
    }

    return projectChoices;
};

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
 * Will remove prompts from the specified prompts based on prompt options
 * Removing prompts is preferable to using `when()` to prevent continuous re-evaluation.
 *
 * @param prompts Keyed prompts object containing all possible prompts
 * @param promptOptions prompt options
 * @returns the updated questions
 */
export function hidePrompts(
    prompts: Record<promptNames, UI5LibraryReferenceQuestion>,
    promptOptions?: UI5LibraryReferencePromptOptions
): UI5LibraryReferenceQuestion[] {
    const questions: UI5LibraryReferenceQuestion[] = [];
    if (promptOptions) {
        Object.keys(prompts).forEach((key) => {
            const promptKey = key as keyof typeof promptNames;
            if (!promptOptions?.[promptKey]?.hide) {
                questions.push(prompts[promptKey]);
            }
        });
    } else {
        questions.push(...Object.values(prompts));
    }
    return questions;
}

/**
 * Extends a validate function.
 *
 * @param question - the question to which the validate function will be applied
 * @param validateFunc - the validate function which will be applied to the question
 * @returns the extended validate function
 */
function extendValidate(
    question: Question,
    validateFunc: validate<UI5LibraryReferenceAnswers>
): validate<UI5LibraryReferenceAnswers> {
    const validate = question.validate;
    return (
        value: unknown,
        previousAnswers?: UI5LibraryReferenceAnswers | undefined
    ): ReturnType<validate<UI5LibraryReferenceAnswers>> => {
        const extVal = validateFunc(value, previousAnswers);
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
 * @returns the extended question
 */
function applyExtensionFunction(
    question: YUIQuestion,
    promptOption: CommonPromptOptions,
    funcName: 'validate' | 'additionalMessages'
): YUIQuestion {
    let extendedFunc;

    if (funcName === 'validate' && promptOption.validate) {
        extendedFunc = extendValidate(question, promptOption.validate);
    }

    if (funcName === 'additionalMessages' && promptOption.additionalMessages) {
        extendedFunc = extendAdditionalMessages(question, promptOption.additionalMessages);
    }

    question = Object.assign(question, { [funcName]: extendedFunc });
    return question;
}

/**
 * Updates questions with extensions for specific properties. Only `validate`, `default` and `additionalMessages` are currently supported.
 *
 * @param questions - array of prompts to be extended
 * @param promptOptions - the prompt options possibly containing function extensions
 * @returns - the extended questions
 */
export function extendWithOptions(
    questions: UI5LibraryReferenceQuestion[],
    promptOptions: UI5LibraryReferencePromptOptions
): UI5LibraryReferenceQuestion[] {
    questions.forEach((question) => {
        const promptOptKey = question.name as keyof typeof promptNames;
        const promptOpt = promptOptions[promptOptKey];
        if (promptOpt) {
            const propsToExtend = Object.keys(promptOpt);

            for (const extProp of propsToExtend) {
                if (extProp === 'validate' || extProp === 'additionalMessages') {
                    question = applyExtensionFunction(question, promptOpt as CommonPromptOptions, extProp);
                }
            }
        }
    });
    return questions;
}
