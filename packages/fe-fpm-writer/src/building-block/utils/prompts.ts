import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { DOMParser } from '@xmldom/xmldom';
import type { ListQuestion } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { relative } from 'path';
import type ProjectProvider from './project';
import { getAnnotationPathQualifiers, getEntityTypes } from './service';

/**
 * Returns a Prompt to choose a boolean value.
 *
 * @param name
 * @param message
 * @returns a boolean prompt
 */
export function getBooleanPrompt(name: string, message: string): ListQuestion {
    return {
        type: 'list',
        name,
        message,
        choices: [
            { name: 'False', value: false },
            { name: 'True', value: true }
        ]
    } as ListQuestion;
}

/**
 * Returns the prompt for choosing the existing annotation term.
 *
 * @param name
 * @param message
 * @param projectProvider
 * @param annotationTerm
 * @returns prompt for choosing the annotation term
 */
export function getAnnotationPathQualifierPrompt(
    name: string,
    message: string,
    projectProvider: ProjectProvider,
    annotationTerm: UIAnnotationTerms[]
): ListQuestion {
    return {
        type: 'list',
        name,
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
    } as ListQuestion;
}
/**
 * Returns the prompt for choosing a View or a Fragment file.
 *
 * @param fs
 * @param basePath
 * @param message
 * @param validationErrorMessage
 * @returns a prompt
 */
export function getViewOrFragmentFilePrompt(
    fs: Editor,
    basePath: string,
    message: string,
    validationErrorMessage: string
): ListQuestion {
    return {
        type: 'list',
        name: 'viewOrFragmentFile',
        message,
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
        validate: (value: string) => (value ? true : validationErrorMessage)
    } as ListQuestion;
}

/**
 * Returns a Prompt for choosing an entity.
 *
 * @param message
 * @param projectProvider
 * @returns entity question
 */
export function getEntityPrompt(message: string, projectProvider: ProjectProvider): ListQuestion {
    return {
        type: 'list',
        name: 'entity',
        message,
        choices: async () => {
            const choices = getChoices((await getEntityTypes(projectProvider)).map((e) => e.fullyQualifiedName));
            if (!choices.length) {
                throw new Error('Failed while fetching the entities');
            }
            return choices;
        }
    } as ListQuestion;
}
/**
 * Return a Prompt for choosing the aggregation path.
 *
 * @param message
 * @param fs
 * @returns
 */
export function getAggregationPathPrompt(message: string, fs: Editor): ListQuestion {
    return {
        type: 'list',
        name: 'aggregationPath',
        message,
        choices: (answers: any) => {
            const { viewOrFragmentFile } = answers;
            const choices = getChoices(getXPathStringsForXmlFile(viewOrFragmentFile, fs));
            if (!choices.length) {
                throw new Error('Failed while fetching the aggregation path.');
            }
            return choices;
        }
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
 * @param fs
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
 * @param {Error | unknown} error  - the error instance
 * @returns {string} the error message
 */
function getErrorMessage(error: Error | unknown): string {
    return error instanceof Error ? error.message : String(error);
}
