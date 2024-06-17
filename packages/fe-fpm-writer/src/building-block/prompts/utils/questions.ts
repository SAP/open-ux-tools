import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { DOMParser } from '@xmldom/xmldom';
import type { Answers, InputQuestion, ListQuestion } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { relative } from 'path';
import { ProjectProvider } from './project';
import { getAnnotationPathQualifiers, getEntityTypes } from './service';
import { getCapServiceName } from '@sap-ux/project-access';
import type { InputPromptQuestion, ListPromptQuestion } from '../types';
import { BuildingBlockType } from '../../types';

/**
 * Returns a Prompt to choose a boolean value.
 *
 * @param name - The name of the prompt
 * @param message - The message to display in the prompt
 * @returns a boolean prompt
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
 * @param name - The name of the prompt
 * @param message - The message to display in the prompt
 * @param projectProvider - The project provider
 * @param annotationTerm - The annotation term
 * @returns prompt for choosing the annotation term
 */
export function getAnnotationPathQualifierPrompt(
    name: string,
    message: string,
    projectProvider: ProjectProvider,
    annotationTerm: UIAnnotationTerms[],
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name,
        selectType: 'dynamic',
        message,
        choices: async (answers) => {
            const { entity } = answers;
            const choices = getChoices(
                await getAnnotationPathQualifiers(projectProvider, entity, annotationTerm, true)
            );
            if (!choices.length) {
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
 * @param fs - The file system object for reading files
 * @param basePath - The base path to search for files
 * @param message - The message to display in the prompt
 * @param validationErrorMessage - The error message to show if validation fails
 * @param dependantPromptNames - Dependant prompts names
 * @returns a prompt
 */
export function getViewOrFragmentFilePrompt(
    fs: Editor,
    basePath: string,
    message: string,
    validationErrorMessage: string,
    dependantPromptNames = ['aggregationPath'], // dependent prompts
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        selectType: 'dynamic',
        name: 'viewOrFragmentFile',
        message,
        dependantPromptNames,
        choices: async () => {
            const files = await findFilesByExtension(
                '.xml',
                basePath,
                ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                fs
            );
            return files.map((file) => ({
                name: relative(basePath, file),
                value: file
            }));
        },
        validate: (value: string) => (value ? true : validationErrorMessage),
        placeholder: additionalProperties.placeholder ?? 'Select a view or fragment file'
    };
}

export async function getCAPServicePrompt(
    message: string,
    projectProvider: ProjectProvider,
    dependantPromptNames?: string[],
    additionalProperties: Partial<ListPromptQuestion> = {}
): Promise<ListPromptQuestion> {
    const services = await getCAPServiceChoices(projectProvider);
    const defaultValue = services.length === 1 ? services[0].value : undefined;
    return {
        ...additionalProperties,
        type: 'list',
        name: 'service',
        selectType: 'dynamic',
        dependantPromptNames,
        message,
        choices: getCAPServiceChoices.bind(null, projectProvider),
        default: defaultValue,
        placeholder: additionalProperties.placeholder ?? 'Select a service'
    };
}

/**
 * Returns a Prompt for choosing an entity.
 *
 * @param message - The message to display in the prompt
 * @param projectProvider - The project provider
 * @param dependantPromptNames - Dependant prompts names
 * @returns entity question
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
        name: 'entity',
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
            return getChoices(entityTypeMap);
        },
        placeholder: additionalProperties.placeholder ?? 'Select an entity'
    };
}

export async function getCAPServiceChoices(
    projectProvider: ProjectProvider
): Promise<Array<{ name: string; value: string }>> {
    const project = await projectProvider.getProject();
    const services = project.apps[projectProvider.appId]?.services;
    const servicesMap: { [key: string]: string } = {};
    for (const serviceKey of Object.keys(services)) {
        const mappedServiceName = await getCapServiceName(
            project.root,
            project.apps[projectProvider.appId].services[serviceKey]?.uri || ''
        );
        servicesMap[mappedServiceName] = serviceKey;
    }
    return getChoices(servicesMap);
}

/**
 * Return a Prompt for choosing the aggregation path.
 *
 * @param message - The message to display in the prompt
 * @param fs - The file system object for reading files
 * @returns A ListQuestion object representing the prompt
 */
export function getAggregationPathPrompt(
    message: string,
    fs: Editor,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name: 'aggregationPath',
        selectType: 'dynamic',
        message,
        // ToDo avoid any
        choices: (answers: any) => {
            const { viewOrFragmentFile } = answers;
            const choices = getChoices(getXPathStringsForXmlFile(viewOrFragmentFile, fs));
            if (!choices.length) {
                throw new Error('Failed while fetching the aggregation path.');
            }
            return choices;
        },
        placeholder: additionalProperties.placeholder ?? 'Enter an aggregation path'
    };
}

/**
 * Converts the provided xpath string from `/mvc:View/Page/content` to
 * `/mvc:View/*[local-name()='Page']/*[local-name()='content']`.
 *
 * @param {string} path - the xpath string
 * @returns {string} the augmented xpath string
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
 * @param {string} xmlFilePath - the xml file path
 * @param fs - The file system object for reading files
 * @returns {Record<string, string>} the list of xpath strings
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
            for (let index = 0; index < node.childNodes.length; index++) {
                const childNode = node.childNodes[index];
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
 *
 * @param {Record<string, string> | any[]} obj - object to be converted to choices
 * @returns the list of choices
 */
export function getChoices(obj: Record<string, string> | any[]) {
    if (Array.isArray(obj)) {
        return obj.map((el) => ({ name: el, value: el }));
    }
    return Object.entries(obj).map(([key, value]) => ({ name: key, value }));
}

/**
 * Returns the message property if the error is an instance of `Error` else a string representation of the error.
 *
 * @param {Error} error  - the error instance
 * @returns {string} the error message
 */
function getErrorMessage(error: Error): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Returns a Prompt for entering filter bar ID.
 *
 * @param message - prompt message
 * @returns a Input Prompt
 */
export function getFilterBarIdPrompt(
    message: string,
    additionalProperties: Partial<InputPromptQuestion> = {}
): InputPromptQuestion {
    return {
        ...additionalProperties,
        type: 'input',
        name: 'filterBar',
        message
    };
}

/**
 * Returns a Prompt for selecting existing filter bar ID.
 *
 * @param message - prompt message
 * @returns a List Prompt
 */
export function getFilterBarIdListPrompt(
    message: string,
    fs: Editor,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        selectType: 'dynamic',
        name: 'filterBarId',
        message,
        placeholder: additionalProperties.placeholder ?? 'Select or enter a filter bar ID',
        // ToDo avoid any
        choices: async (answers: Answers) => {
            if (!answers.viewOrFragmentFile) {
                return [];
            }
            return getChoices(
                await getBuildingBlockIdsInFile(answers.viewOrFragmentFile, BuildingBlockType.FilterBar, fs)
            );
        }
    };
}

async function getBuildingBlockIdsInFile(
    viewOrFragmentFile: string,
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
        const xmlContent = fs.read(viewOrFragmentFile);
        const errorHandler = (level: string, message: string): void => {
            throw new Error(`Unable to parse the xml view file. Details: [${level}] - ${message}`);
        };
        const xmlDocument = new DOMParser({ errorHandler }).parseFromString(xmlContent);
        const elements = xmlDocument.getElementsByTagName(buildingBlockSelector);
        for (let i = 0; i < elements.length; i++) {
            const id = elements[i].getAttributeNode('id')?.value;
            id && ids.push(id);
        }
    }
    return ids;
}

/**
 * Returns the Binding Context Type Prompt.
 *
 * @param message - prompt message
 * @returns a List Prompt
 */
export function getBindingContextTypePrompt(
    message: string,
    defaultValue?: string,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    return {
        ...additionalProperties,
        type: 'list',
        name: 'bindingContextType',
        selectType: 'static',
        message,
        choices: [
            { name: 'Relative', value: 'relative' },
            { name: 'Absolute', value: 'absolute' }
        ],
        default: defaultValue
    };
}

/**
 * Returns a Prompt for entering a Building block ID.
 *
 * @param message - The message to display in the prompt
 * @param validationErrorMessage - The error message to show if ID validation fails
 * @returns An InputPrompt object for getting the building block ID
 */
export function getBuildingBlockIdPrompt(
    message: string,
    validationErrorMessage: string,
    defaultValue?: string,
    additionalProperties: Partial<InputPromptQuestion> = {},
    // ToDo avoid any
    validateFn?: (input: any, answers?: Answers) => string | boolean | Promise<string | boolean>
): InputPromptQuestion {
    return {
        ...additionalProperties,
        type: 'input',
        name: 'id',
        message,
        // ToDo avoid any
        validate: validateFn ? validateFn : (value: any) => (value ? true : validationErrorMessage),
        default: defaultValue,
        placeholder: additionalProperties.placeholder ?? 'Enter a building block ID'
    };
}
