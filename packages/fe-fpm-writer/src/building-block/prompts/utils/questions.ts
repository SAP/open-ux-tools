import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { DOMParser } from '@xmldom/xmldom';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { join, relative } from 'path';
import { ProjectProvider } from './project';
import { getAnnotationPathQualifiers, getEntityTypes } from './service';
import { getCapServiceName } from '@sap-ux/project-access';
import type { InputPromptQuestion, ListPromptQuestion, PromptListChoices } from '../types';
import { BuildingBlockType } from '../../types';
import { isElementIdAvailable } from './xml';
import { i18nNamespaces, initI18n, translate } from '../../../i18n';

initI18n();
const t = translate(i18nNamespaces.buildingBlock, 'prompts.common.');

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
            const { entitySet } = answers.buildingBlockData?.metaPath ?? {};
            if (!entitySet) {
                return [];
            }
            const choices = transformChoices(
                await getAnnotationPathQualifiers(projectProvider, entitySet, annotationTerm, true)
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
 * @param fs - The file system object for reading files
 * @param basePath - The base path to search for files
 * @param message - The message to display in the prompt
 * @param validationErrorMessage - The error message to show if validation fails
 * @param dependantPromptNames - Dependant prompts names
 * @returns a prompt
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

export async function getCAPServiceChoices(projectProvider: ProjectProvider): Promise<PromptListChoices> {
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
    return transformChoices(servicesMap);
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
 * @param {Record<string, string> | string[]} obj - object to be converted to choices
 * @returns the list of choices
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
        choices = sort ? obj.sort((a, b) => a.localeCompare(b)) : obj;
    }
    return choices;
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
 * Returns a Prompt for selecting existing filter bar ID or entering a new one.
 *
 * @param message - prompt message
 * @param type - the question type 'list' or 'input'
 * @param fs  - the file system object for reading files
 * @param basePath - the application path
 * @param additionalProperties
 * @returns an Input or List Prompt
 */
export function getFilterBarIdPrompt(
    message: string,
    type: 'input' | 'list',
    fs?: Editor,
    basePath?: string,
    additionalProperties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion | InputPromptQuestion {
    let prompt: InputPromptQuestion = {
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
            { name: t('bindingContextType.option.relative'), value: 'relative' },
            { name: t('bindingContextType.option.absolute'), value: 'absolute' }
        ],
        default: defaultValue
    };
}

/**
 * Returns a Prompt for entering a Building block ID.
 *
 * @param message - The message to display in the prompt
 * @param validationErrorMessage - The error message to show if ID validation fails
 * @param defaultValue
 * @param additionalProperties
 * @returns An InputPrompt object for getting the building block ID
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
