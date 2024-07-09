import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import { DOMParser } from '@xmldom/xmldom';
import type { Answers } from 'inquirer';
import type { Editor } from 'mem-fs-editor';
import { join, relative } from 'path';
import { getAnnotationPathQualifiers, getEntityTypes } from './service';
import { getCapServiceName } from '@sap-ux/project-access';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { Project } from '@sap-ux/project-access';
import type { InputPromptQuestion, ListPromptQuestion, PromptListChoices, WithRequired, PromptContext } from '../types';
import { BuildingBlockType } from '../../types';
import type { BindingContextType } from '../../types';
import { getXPathStringsForXmlFile, isElementIdAvailable } from './xml';
import { i18nNamespaces, initI18n, translate } from '../../../i18n';

// ToDo - recheck if can avoid lint disable
/* eslint-disable @typescript-eslint/no-floating-promises */
initI18n();
const t = translate(i18nNamespaces.buildingBlock, 'prompts.common.');

/**
 * Returns a Prompt to choose a boolean value.
 *
 * @param properties - object with additional properties of question
 * @returns a boolean prompt.
 */
export function getBooleanPrompt(properties: WithRequired<Partial<ListPromptQuestion>, 'name'>): ListPromptQuestion {
    return {
        ...properties,
        type: 'list',
        selectType: 'static',
        choices: [
            { name: 'False', value: false },
            { name: 'True', value: true }
        ]
    };
}

/**
 * Returns the prompt for choosing the existing annotation term.
 *
 * @param context - prompt context including data about project
 * @param properties - object with additional properties of question
 * @param annotationTerm - the annotation term
 * @returns prompt for choosing the annotation term.
 */
export function getAnnotationPathQualifierPrompt(
    context: PromptContext,
    properties: Partial<ListPromptQuestion> = {},
    annotationTerm: UIAnnotationTerms[] = []
): ListPromptQuestion {
    const { project, appId } = context;
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.metaPath.qualifier',
        selectType: 'dynamic',
        choices: async (answers) => {
            const { entitySet, bindingContextType } = answers.buildingBlockData?.metaPath ?? {};
            if (!entitySet) {
                return [];
            }
            const bindingContext: { type: BindingContextType; isCollection?: boolean } = bindingContextType
                ? {
                      type: bindingContextType,
                      isCollection: answers.buildingBlockData.buildingBlockType === BuildingBlockType.Table
                  }
                : { type: 'absolute' };
            const choices = transformChoices(
                await getAnnotationPathQualifiers(project, appId, entitySet, annotationTerm, bindingContext, true)
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
 * @param context - prompt context including data about project
 * @param validationErrorMessage - the error message to show if validation fails
 * @param properties - object with additional properties of question
 * @returns prompt for choosing the fragment file.
 */
export function getViewOrFragmentPathPrompt(
    context: PromptContext,
    validationErrorMessage: string,
    properties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    const { fs, appPath } = context;
    return {
        ...properties,
        type: 'list',
        selectType: 'dynamic',
        name: 'viewOrFragmentPath',
        choices: async () => {
            const files = await findFilesByExtension(
                '.xml',
                appPath,
                ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                fs
            );
            return transformChoices(files.map((file) => relative(appPath, file)));
        },
        validate: (value: string) => (value ? true : validationErrorMessage),
        placeholder: properties.placeholder ?? t('viewOrFragmentPath.defaultPlaceholder')
    };
}

/**
 * Returns the prompt for choosing CAP service.
 *
 * @param context - prompt context including data about project
 * @param properties - object with additional properties of question
 * @returns prompt for choosing CAP service.
 */
export async function getCAPServicePrompt(
    context: PromptContext,
    properties: Partial<ListPromptQuestion> = {}
): Promise<ListPromptQuestion> {
    const { project, appId } = context;
    const services = await getCAPServiceChoices(project, appId);
    const defaultValue: string | undefined =
        services.length === 1 ? (services[0] as { name: string; value: string }).value : undefined;
    return {
        ...properties,
        type: 'list',
        name: 'service',
        selectType: 'dynamic',
        choices: getCAPServiceChoices.bind(null, project, appId),
        default: defaultValue,
        placeholder: properties.placeholder ?? t('service.defaultPlaceholder')
    };
}

/**
 * Returns a Prompt for choosing an entity.
 *
 * @param context - prompt context including data about project
 * @param properties - object with additional properties of question
 * @returns prompt for choosing entity.
 */
export function getEntityPrompt(
    context: PromptContext,
    properties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    const { project, appId } = context;
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.metaPath.entitySet',
        selectType: 'dynamic',
        choices: async () => {
            const entityTypes = await getEntityTypes(project, appId);
            const entityTypeMap: { [key: string]: string } = {};
            for (const entityType of entityTypes) {
                const value = entityType.fullyQualifiedName;
                const qualifierParts = value.split('.');
                entityTypeMap[qualifierParts[qualifierParts.length - 1]] = value;
            }
            return transformChoices(entityTypeMap);
        },
        placeholder: properties.placeholder ?? t('entity.defaultPlaceholder')
    };
}

/**
 * Method returns choices for cap service selection.
 *
 * @param project = project
 * @param appId - application id
 * @returns choices for cap service selection.
 */
export async function getCAPServiceChoices(project: Project, appId: string): Promise<PromptListChoices> {
    const services = project.apps[appId]?.services;
    const servicesMap: { [key: string]: string } = {};
    for (const serviceKey of Object.keys(services)) {
        const mappedServiceName = await getCapServiceName(
            project.root,
            project.apps[appId].services[serviceKey]?.uri ?? ''
        );
        servicesMap[mappedServiceName] = serviceKey;
    }
    return transformChoices(servicesMap);
}

/**
 * Return a Prompt for choosing the aggregation path.
 *
 * @param context - prompt context including data about project
 * @param properties - object with additional properties of question
 * @returns prompt for choosing aggregation path of selected xml file.
 */
export function getAggregationPathPrompt(
    context: PromptContext,
    properties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    const { fs, appPath } = context;
    return {
        ...properties,
        type: 'list',
        name: 'aggregationPath',
        selectType: 'dynamic',
        choices: (answers: Answers) => {
            const { viewOrFragmentPath } = answers;
            if (viewOrFragmentPath) {
                const choices = transformChoices(
                    getXPathStringsForXmlFile(join(appPath, viewOrFragmentPath), fs),
                    false
                );
                if (!choices.length) {
                    throw new Error('Failed while fetching the aggregation path.');
                }
                return choices;
            }
            return [];
        },
        placeholder: properties.placeholder ?? t('aggregationPath.defaultPlaceholder')
    };
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
        return sort ? [...obj].sort((a, b) => a.localeCompare(b)) : obj;
    }
    return choices;
}

/**
 * Returns a Prompt for selecting existing filter bar ID or entering a new one.
 *
 * @param context - prompt context including data about project
 * @param properties - Object with additional properties of question
 * @returns an Input or List Prompt
 */
export function getFilterBarIdPrompt(
    context: PromptContext,
    properties: WithRequired<Partial<ListPromptQuestion | InputPromptQuestion>, 'type'>
): ListPromptQuestion | InputPromptQuestion {
    const { fs, appPath } = context;
    const prompt: InputPromptQuestion = {
        ...properties,
        type: 'input',
        name: 'buildingBlockData.filterBar',
        placeholder: properties.placeholder ?? t('filterBar.defaultPlaceholder')
    };
    if (properties.type === 'input') {
        return prompt;
    }
    return {
        ...prompt,
        type: 'list',
        selectType: 'dynamic',
        choices: async (answers: Answers) => {
            if (!answers.viewOrFragmentPath) {
                return [];
            }
            return transformChoices(
                await getBuildingBlockIdsInFile(
                    join(appPath!, answers.viewOrFragmentPath),
                    BuildingBlockType.FilterBar,
                    fs!
                )
            );
        }
    };
}

// ToDo - move to utils/xml?
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
 * @param properties - object with additional properties of question
 * @returns prompt for choosing binding context type.
 */
export function getBindingContextTypePrompt(properties: Partial<ListPromptQuestion> = {}): ListPromptQuestion {
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.metaPath.bindingContextType',
        selectType: 'static',
        choices: [
            { name: t('bindingContextType.option.relative'), value: 'relative' },
            { name: t('bindingContextType.option.absolute'), value: 'absolute' }
        ]
    };
}

/**
 * Returns a Prompt for entering a Building block ID.
 *
 * @param context - prompt context including data about project
 * @param validationErrorMessage - The error message to show if ID validation fails
 * @param properties - object with additional properties of question
 * @returns an InputPrompt object for getting the building block ID
 */
export function getBuildingBlockIdPrompt(
    context: PromptContext,
    validationErrorMessage: string,
    properties: Partial<InputPromptQuestion> = {}
): InputPromptQuestion {
    const { fs, appPath } = context;
    return {
        ...properties,
        type: 'input',
        name: 'buildingBlockData.id',
        validate: (value: string, answers?: Answers) => {
            if (!value) {
                return validationErrorMessage;
            } else {
                // ToDo
                return answers?.viewOrFragmentPath &&
                    !isElementIdAvailable(fs, join(appPath, answers.viewOrFragmentPath), value)
                    ? t('id.existingIdValidation')
                    : true;
            }
        },
        placeholder: properties.placeholder ?? t('id.defaultPlaceholder')
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
