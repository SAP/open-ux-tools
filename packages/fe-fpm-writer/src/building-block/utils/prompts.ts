import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { DOMParser } from '@xmldom/xmldom';
import type { Answers, InputQuestion, ListQuestion } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { relative } from 'path';
import type ProjectProvider from './project';
import { getAnnotationPathQualifiers, getEntityTypes } from './service';
import { AdditionalPromptProperties } from '../prompts';

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
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'list',
        name,
        selectType: 'static',
        message,
        choices: [
            { name: 'False', value: false },
            { name: 'True', value: true }
        ],
        default: defaultValue,
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
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
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
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
        },
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
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
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
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
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
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
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'list',
        name: 'entity',
        selectType: 'dynamic',
        dependantPromptNames,
        message,
        choices: getEntityChoices.bind(null, projectProvider),
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
}

/**
 * Method returns choices for entity type selection.
 *
 * @param projectProvider - The project provider
 * @returns entity question
 */
// ToDo - recheck types fr choices
export async function getEntityChoices(
    projectProvider: ProjectProvider
): Promise<Array<{ name: string; value: string }>> {
    const entityTypes = await getEntityTypes(projectProvider);
    const entityTypeMap: { [key: string]: string } = {};
    for (const entityType of entityTypes) {
        const value = entityType.fullyQualifiedName;
        const qualifierParts = value.split('.');
        entityTypeMap[qualifierParts[qualifierParts.length - 1]] = value;
    }
    return getChoices(entityTypeMap);
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
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'list',
        name: 'aggregationPath',
        selectType: 'dynamic',
        message,
        choices: (answers: any) => {
            const { viewOrFragmentFile } = answers;
            const choices = getChoices(getXPathStringsForXmlFile(viewOrFragmentFile, fs));
            if (!choices.length) {
                throw new Error('Failed while fetching the aggregation path.');
            }
            return choices;
        },
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
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
            const { parentNode, node } = (nodes as any).shift();
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
    additionalProperties: AdditionalPromptProperties = {}
): InputQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'input',
        name: 'filterBar',
        message,
        groupId,
        required,
        additionalInfo
    } as InputQuestion;
}

/**
 * Returns a Prompt for selecting existing filter bar ID.
 *
 * @param message - prompt message
 * @returns a List Prompt
 */
export function getFilterBarIdListPrompt(
    message: string,
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'list',
        selectType: 'dynamic',
        name: 'filterBarId',
        message,
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
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
    additionalProperties: AdditionalPromptProperties = {}
): ListQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'list',
        name: 'bindingContextType',
        selectType: 'static',
        message,
        choices: [
            { name: 'Relative', value: 'relative' },
            { name: 'Absolute', value: 'absolute' }
        ],
        default: defaultValue,
        groupId,
        required,
        additionalInfo
    } as ListQuestion;
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
    additionalProperties: AdditionalPromptProperties = {},
    validateFn?: (input: any, answers?: Answers) => string | boolean | Promise<string | boolean>
): InputQuestion {
    const { required, groupId, additionalInfo } = additionalProperties;
    return {
        type: 'input',
        name: 'id',
        message,
        validate: validateFn ? validateFn : (value: any) => (value ? true : validationErrorMessage),
        groupId,
        required,
        additionalInfo,
        default: defaultValue
    } as InputQuestion;
}
