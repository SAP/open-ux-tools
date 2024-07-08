import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { DOMParser } from '@xmldom/xmldom';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { join, relative } from 'path';
import type { ProjectProvider } from './project';
import { getAnnotationPathQualifiers, getEntityTypes } from './service';
import { getCapServiceName } from '@sap-ux/project-access';
import type { InputPromptQuestion, ListPromptQuestion, PromptListChoices } from '../types';
import { BuildingBlockType } from '../../types';
import type { BindingContextType } from '../../types';
import { isElementIdAvailable } from './xml';
import { i18nNamespaces, initI18n, translate } from '../../../i18n';

// ToDo - recheck if can avoid lint disable
/* eslint-disable @typescript-eslint/no-floating-promises */
initI18n();
const t = translate(i18nNamespaces.buildingBlock, 'prompts.common.');

/**
 * Returns a Prompt to choose a boolean value.
 *
 * @param name - the name of the prompt
 * @param message - the message to display in the prompt
 * @param defaultValue - default value
 * @param additionalProperties - object with additional properties of question
 * @returns a boolean prompt.
 */
export function getBooleanPrompt(
    name: string,
    message: string,
    defaultValue?: string,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name,
        selectType: 'static',
        message,
        choices: [
            { name: 'False', value: false },
            { name: 'True', value: true }
        ],
        default: defaultValue
    };
}

/**
 * Returns the prompt for choosing the existing annotation term.
 *
 * @param message - the message to display in the prompt
 * @param projectProvider - the project provider
 * @param annotationTerm - the annotation term
 * @param additionalProperties - object with additional properties of question
 * @returns prompt for choosing the annotation term.
 */
export function getAnnotationPathQualifierPrompt(
    message: string,
    projectProvider: ProjectProvider,
    annotationTerm: UIAnnotationTerms[],
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name: 'buildingBlockData.metaPath.qualifier',
        selectType: 'dynamic',
        message,
        choices: async (answers) => {
            const { entitySet, bindingContextType } = answers.buildingBlockData?.metaPath ?? {};
            if (!entitySet) {
                return [];
            }
            const bindingContext: { type: BindingContextType; isCollection?: boolean } = bindingContextType
                ? {
                      type: bindingContextType,
                      isCollection: answers.buildingBlockData.type === BuildingBlockType.Table //TODO: BB type
                  }
                : { type: 'absolute' };
            const choices = transformChoices(
                await getAnnotationPathQualifiers(projectProvider, entitySet, annotationTerm, bindingContext, true)
            );
            if (entitySet && !choices.length) {
                throw new Error(
                    `Couldn't find any existing annotations for term ${annotationTerm.join(
                        ','
                    )}. Please add ${annotationTerm.join(',')} annotation/s`
                );
            }
            return choices;
        }
    };
}

/**
 * Returns the prompt for choosing a View or a Fragment file.
 *
 * @param fs - the file system object for reading files
 * @param basePath - the base path to search for files
 * @param message - the message to display in the prompt
 * @param validationErrorMessage - the error message to show if validation fails
 * @param dependantPromptNames - dependant prompts names
 * @param additionalProperties - object with additional properties of question
 * @returns prompt for choosing the fragment file.
 */
export function getViewOrFragmentPathPrompt(
    fs: Editor,
    basePath: string,
    message: string,
    validationErrorMessage: string,
    dependantPromptNames = ['aggregationPath'],
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        selectType: 'dynamic',
        name: 'viewOrFragmentPath',
        message,
        dependantPromptNames,
        choices: async () => {
            const files = await findFilesByExtension(
                '.xml',
                basePath,
                ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                fs
            );
            return transformChoices(files.map((file) => relative(basePath, file)));
        },
        validate: (value: string) => (value ? true : validationErrorMessage),
        placeholder: additionalProperties.placeholder ?? t('viewOrFragmentPath.defaultPlaceholder')
    };
}

/**
 * Returns the prompt for choosing CAP service.
 *
 * @param message - the message to display in the prompt
 * @param projectProvider - the project provider
 * @param dependantPromptNames - dependant prompts names
 * @param additionalProperties - object with additional properties of question
 * @returns prompt for choosing CAP service.
 */
export async function getCAPServicePrompt(
    message: string,
    projectProvider: ProjectProvider,
    dependantPromptNames?: string[],
    additionalProperties: Partial<ListPromptQuestion> = {}
): Promise<ListPromptQuestion> {
    const services = await getCAPServiceChoices(projectProvider);
    const defaultValue: string | undefined =
        services.length === 1 ? (services[0] as { name: string; value: string }).value : undefined;
    return {
        ...additionalProperties,
        type: 'list',
        // ToDo - where it fits?
        name: 'service',
        selectType: 'dynamic',
        dependantPromptNames,
        message,
        choices: getCAPServiceChoices.bind(null, projectProvider),
        default: defaultValue,
        placeholder: additionalProperties.placeholder ?? t('service.defaultPlaceholder')
    };
}

/**
 * Returns a Prompt for choosing an entity.
 *
 * @param message - the message to display in the prompt
 * @param projectProvider - the project provider
 * @param dependantPromptNames - dependant prompts names
 * @param additionalProperties - object with additional properties of question
 * @returns prompt for choosing entity.
 */
export function getEntityPrompt(
    message: string,
    projectProvider: ProjectProvider,
    dependantPromptNames?: string[],
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name: 'buildingBlockData.metaPath.entitySet',
        selectType: 'dynamic',
        dependantPromptNames,
        message,
        choices: async () => {
            const entityTypes = await getEntityTypes(projectProvider);
            const entityTypeMap: { [key: string]: string } = {};
            for (const entityType of entityTypes) {
                const value = entityType.fullyQualifiedName;
                const qualifierParts = value.split('.');
                entityTypeMap[qualifierParts[qualifierParts.length - 1]] = value;
            }
            return transformChoices(entityTypeMap);
        },
        placeholder: additionalProperties.placeholder ?? t('entity.defaultPlaceholder')
    };
}

/**
 * Method returns choices for cap service selection.
 *
 * @param projectProvider - the project provider
 * @returns choices for cap service selection.
 */
export async function getCAPServiceChoices(projectProvider: ProjectProvider): Promise<PromptListChoices> {
    const project = await projectProvider.getProject();
    const services = project.apps[projectProvider.appId]?.services;
    const servicesMap: { [key: string]: string } = {};
    for (const serviceKey of Object.keys(services)) {
        const mappedServiceName = await getCapServiceName(
            project.root,
            project.apps[projectProvider.appId].services[serviceKey]?.uri ?? ''
        );
        servicesMap[mappedServiceName] = serviceKey;
    }
    return transformChoices(servicesMap);
}

/**
 * Return a Prompt for choosing the aggregation path.
 *
 * @param message - the message to display in the prompt
 * @param fs - the file system object for reading files
 * @param basePath - the base path to search for aggregations
 * @param additionalProperties - object with additional properties of question
 * @returns prompt for choosing aggregation path of selected xml file.
 */
export function getAggregationPathPrompt(
    message: string,
    fs: Editor,
    basePath: string,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name: 'aggregationPath',
        selectType: 'dynamic',
        message,
        choices: (answers: Answers) => {
            const { viewOrFragmentPath } = answers;
            if (viewOrFragmentPath) {
                const choices = transformChoices(
                    getXPathStringsForXmlFile(join(basePath, viewOrFragmentPath), fs),
                    false
                );
                if (!choices.length) {
                    throw new Error('Failed while fetching the aggregation path.');
                }
                return choices;
            }
            return [];
        },
        placeholder: additionalProperties.placeholder ?? t('aggregationPath.defaultPlaceholder')
    };
}

/**
 * Converts the provided xpath string from `/mvc:View/Page/content` to
 * `/mvc:View/*[local-name()='Page']/*[local-name()='content']`.
 *
 * @param path - the xpath string
 * @returns the augmented xpath string.
 */
export const augmentXpathWithLocalNames = (path: string): string => {
    const result = [];
    for (const token of path.split('/')) {
        result.push(token === '' || token.includes(':') ? token : `*[local-name()='${token}']`);
    }
    return result.join('/');
};

/**
 * Returns a list of xpath strings for each element of the xml file provided.
 *
 * @param xmlFilePath - the xml file path
 * @param fs - the file system object for reading files
 * @returns the list of xpath strings.
 */
export function getXPathStringsForXmlFile(xmlFilePath: string, fs: Editor): Record<string, string> {
    const result: Record<string, string> = {};
    try {
        const xmlContent = fs.read(xmlFilePath);
        const errorHandler = (level: string, message: string) => {
            throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
        };
        const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
        const nodes = [{ parentNode: '', node: xmlDocument.firstChild }];
        while (nodes && nodes.length > 0) {
            const { parentNode, node } = nodes.shift()!;
            if (!node) {
                continue;
            }
            result[`${parentNode}/${node.nodeName}`] = augmentXpathWithLocalNames(`${parentNode}/${node.nodeName}`);
            const childNodes = Array.from(node.childNodes);
            for (const childNode of childNodes) {
                if (childNode.nodeType === childNode.ELEMENT_NODE) {
                    nodes.push({
                        parentNode: `${parentNode}/${node.nodeName}`,
                        node: childNode
                    });
                }
            }
        }
    } catch (error) {
        throw new Error(`An error occurred while parsing the view or fragment xml. Details: ${getErrorMessage(error)}`);
    }
    return result;
}

/**
 * Method converts choices to "PromptListChoices" type.
 *
 * @param obj - object to be converted to choices
 * @param sort - apply alphabetical sort(default is "true")
 * @returns the list of choices.
 */
export function transformChoices(obj: Record<string, string> | string[], sort = true): PromptListChoices {
    let choices: PromptListChoices = [];
    if (!Array.isArray(obj)) {
        choices = Object.entries(obj).map(([key, value]) => ({ name: key, value }));
        if (sort) {
            choices = (choices as { name: string; value: string }[]).sort((a, b) => a.name.localeCompare(b.name));
        }
    } else {
        obj = [...new Set(obj)];
        choices = obj;
        if (sort) {
            const sorted = obj.sort((a, b) => a.localeCompare(b));
            return sorted;
        }
    }
    return choices;
}

/**
 * Returns the message property if the error is an instance of `Error` else a string representation of the error.
 *
 * @param {Error} error  - the error instance
 * @returns {string} the error message.
 */
function getErrorMessage(error: Error): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Returns a Prompt for selecting existing filter bar ID or entering a new one.
 *
 * @param message - prompt message
 * @param type - the question type 'list' or 'input'
 * @param fs  - the file system object for reading files
 * @param basePath - the application path
 * @param additionalProperties - Object with additional properties of question
 * @returns an Input or List Prompt
 */
export function getFilterBarIdPrompt(
    message: string,
    type: 'input' | 'list',
    fs?: Editor,
    basePath?: string,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion | InputPromptQuestion {
    const prompt: InputPromptQuestion = {
        type: 'input',
        name: 'buildingBlockData.filterBar',
        message,
        placeholder: additionalProperties.placeholder ?? t('filterBar.defaultPlaceholder')
    };
    if (type === 'input') {
        return prompt;
    }
    return {
        ...prompt,
        ...additionalProperties,
        type,
        selectType: 'dynamic',
        choices: async (answers: Answers) => {
            if (!answers.viewOrFragmentPath) {
                return [];
            }
            return transformChoices(
                await getBuildingBlockIdsInFile(
                    join(basePath!, answers.viewOrFragmentPath),
                    BuildingBlockType.FilterBar,
                    fs!
                )
            );
        }
    };
}

/**
 * Method returns ids of specific macro element found in passed xml file.
 *
 * @param viewOrFragmentPath - path to fragment or view file
 * @param buildingBlockType - building block type
 * @param fs  - the file system object for reading files
 * @returns an array of ids found in passed xml file.
 */
async function getBuildingBlockIdsInFile(
    viewOrFragmentPath: string,
    buildingBlockType: BuildingBlockType,
    fs: Editor
): Promise<string[]> {
    const ids: string[] = [];
    let buildingBlockSelector;
    switch (buildingBlockType) {
        case BuildingBlockType.FilterBar:
            buildingBlockSelector = 'macros:FilterBar';
            break;
        case BuildingBlockType.Table:
            buildingBlockSelector = 'macros:Table';
            break;
        case BuildingBlockType.Chart:
            buildingBlockSelector = 'macros:Chart';
            break;
    }
    if (buildingBlockSelector) {
        const xmlContent = fs.read(viewOrFragmentPath);
        const errorHandler = (level: string, message: string): void => {
            throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
        };
        const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
        const elements = Array.from(xmlDocument.getElementsByTagName(buildingBlockSelector));
        for (const element of elements) {
            const id = element.getAttributeNode('id')?.value;
            id && ids.push(id);
        }
    }
    return ids;
}

/**
 * Returns the Binding Context Type Prompt.
 *
 * @param message - prompt message
 * @param defaultValue - default value
 * @param dependantPromptNames - array of dependant question names
 * @param additionalProperties - object with additional properties of question
 * @returns prompt for choosing binding context type.
 */
export function getBindingContextTypePrompt(
    message: string,
    defaultValue?: string,
    dependantPromptNames = ['buildingBlockData.metaPath.qualifier'],
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name: 'buildingBlockData.metaPath.bindingContextType',
        selectType: 'static',
        message,
        dependantPromptNames,
        choices: [
            { name: t('bindingContextType.option.relative'), value: 'relative' },
            { name: t('bindingContextType.option.absolute'), value: 'absolute' }
        ],
        default: defaultValue
    };
}

/**
 * Returns a Prompt for entering a Building block ID.
 *
 * @param fs  - the file system object for reading files
 * @param message - The message to display in the prompt
 * @param validationErrorMessage - The error message to show if ID validation fails
 * @param basePath - the application path
 * @param defaultValue - default value
 * @param additionalProperties - object with additional properties of question
 * @returns an InputPrompt object for getting the building block ID
 */
export function getBuildingBlockIdPrompt(
    fs: Editor,
    message: string,
    validationErrorMessage: string,
    basePath: string,
    defaultValue?: string,
    additionalProperties: Partial<InputPromptQuestion> = {}
): InputPromptQuestion {
    return {
        ...additionalProperties,
        type: 'input',
        name: 'buildingBlockData.id',
        message,
        validate: (value: string, answers?: Answers) => {
            if (!value) {
                return validationErrorMessage;
            } else {
                // ToDo
                return answers?.viewOrFragmentPath &&
                    !isElementIdAvailable(fs, join(basePath, answers.viewOrFragmentPath), value)
                    ? t('id.existingIdValidation')
                    : true;
            }
        },
        default: defaultValue,
        placeholder: additionalProperties.placeholder ?? t('id.defaultPlaceholder')
    };
}

/**
 * Method returns value of answer by given path.
 *
 * @param answers - answers object
 * @param path - question name of path to answer
 * @returns value of answer
 */
export function getAnswer(answers: Answers, path: string): unknown {
    const keys = path.split('.');
    let current = answers;

    for (const key of keys) {
        if (typeof current !== 'object' || !(key in current)) {
            return undefined;
        }
        current = current[key];
    }

    return current;
}
