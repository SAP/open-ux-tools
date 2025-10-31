import type { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';
import type { Answers } from 'inquirer';
import { join, relative } from 'node:path';
import { getAnnotationPathQualifiers } from './service';
import { getCapServiceName } from '@sap-ux/project-access';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { Project } from '@sap-ux/project-access';
import type {
    InputPromptQuestion,
    ListPromptQuestion,
    PromptListChoices,
    WithRequired,
    PromptContext
} from '../../../prompts/types';
import { bindingContextAbsolute, BuildingBlockType } from '../../types';
import type { BindingContextType } from '../../types';
import { getFilterBarIdsInFile, getXPathStringsForXmlFile, isElementIdAvailable } from './xml';
import { i18nNamespaces, initI18n, translate } from '../../../i18n';
import { getEntitySetOptions, resolveEntitySetTargets, loadEntitySets } from './prompt-helpers';

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
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'list',
        choices: [
            { name: 'False', value: false },
            { name: 'True', value: true }
        ],
        guiOptions: {
            ...guiOptions,
            selectType: 'static'
        }
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
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.metaPath.qualifier',
        choices: project
            ? async (answers) => {
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
            : [],
        guiOptions: {
            ...guiOptions,
            selectType: 'dynamic'
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
    const { fs, project, appPath } = context;
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'list',
        name: 'viewOrFragmentPath',
        choices: project
            ? async () => {
                  const files = await findFilesByExtension(
                      '.xml',
                      appPath,
                      ['.git', 'node_modules', 'dist', 'annotations', 'localService'],
                      fs
                  );
                  const lookupFiles = ['.fragment.xml', '.view.xml'];
                  return transformChoices(
                      files
                          .filter((fileName) => lookupFiles.some((lookupFile) => fileName.endsWith(lookupFile)))
                          .map((file) => relative(appPath, file))
                  );
              }
            : [],
        validate: (value: string) => (!project || value ? true : validationErrorMessage),
        guiOptions: {
            ...guiOptions,
            selectType: 'dynamic',
            placeholder: guiOptions?.placeholder ?? (t('viewOrFragmentPath.defaultPlaceholder') as string)
        }
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
    const { guiOptions } = properties;
    const services = project ? await getCAPServiceChoices(project, appId) : [];
    const defaultValue: string | undefined =
        services.length === 1 ? (services[0] as { name: string; value: string }).value : undefined;
    return {
        ...properties,
        type: 'list',
        name: 'service',
        choices: project ? getCAPServiceChoices.bind(null, project, appId) : [],
        default: defaultValue,
        guiOptions: {
            ...guiOptions,
            selectType: 'dynamic',
            placeholder: guiOptions?.placeholder ?? (t('service.defaultPlaceholder') as string)
        }
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
    const { project } = context;
    const { pageContextEntitySet } = context.options ?? {};
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.metaPath.entitySet',
        choices: project
            ? async (answers?: Answers) => {
                  const entitySets = await loadEntitySets(context);
                  // List all entity sets when no page context is defined
                  if (!pageContextEntitySet) {
                      return transformChoices(entitySets.map((entitySet) => entitySet.name));
                  }

                  const bindingContextType =
                      answers?.buildingBlockData?.metaPath.bindingContextType ?? bindingContextAbsolute;

                  const options = getEntitySetOptions(entitySets, pageContextEntitySet, bindingContextType);
                  // If no options, fallback to all entity sets
                  const resolvedOptions = options.length > 0 ? options : [];
                  return transformChoices(resolvedOptions.map((opt) => opt.name));
              }
            : [],
        guiOptions: {
            ...guiOptions,
            selectType: 'dynamic',
            placeholder: guiOptions?.placeholder ?? (t('entity.defaultPlaceholder') as string)
        }
    };
}

/**
 * Returns a Prompt for choosing a property of an entity.
 *
 * @param context - prompt context including data about project
 * @param properties - object with additional properties of question
 * @returns prompt for choosing an entity property.
 */
export function getTargetPropertiesPrompt(
    context: PromptContext,
    properties: Partial<ListPromptQuestion> = {}
): ListPromptQuestion {
    const { project } = context;
    const pageContextEntitySet = context.options?.pageContextEntitySet ?? '';
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.targetProperty',
        choices: project
            ? async (answers?: Answers) => {
                  const entitySets = await loadEntitySets(context);

                  const { bindingContextType, entitySet: selectedNavProp } = answers?.buildingBlockData?.metaPath ?? {};

                  if (!selectedNavProp) {
                      // clear choices if no entity set is selected
                      return [];
                  }

                  const propertyChoices = resolveEntitySetTargets(
                      entitySets,
                      pageContextEntitySet,
                      bindingContextType,
                      selectedNavProp
                  );
                  const transformedChoices = transformChoices(propertyChoices.map((p) => p.name));

                  return transformedChoices;
              }
            : [],
        guiOptions: {
            ...guiOptions,
            selectType: 'dynamic',
            placeholder: guiOptions?.placeholder ?? (t('targetProperty.defaultPlaceholder') as string)
        }
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
    const { fs, project, appPath } = context;
    const { guiOptions } = properties;

    return {
        ...properties,
        type: 'list',
        name: 'aggregationPath',
        choices: project
            ? (answers: Answers) => {
                  const { viewOrFragmentPath } = answers;
                  if (viewOrFragmentPath) {
                      const { inputChoices, pageMacroDefinition } = getXPathStringsForXmlFile(
                          join(appPath, viewOrFragmentPath),
                          fs
                      );
                      const key = Object.keys(inputChoices).find((k) => k.endsWith(`/${pageMacroDefinition}`));
                      const choices = transformChoices(inputChoices, false, key);
                      if (!choices.length) {
                          throw new Error('Failed while fetching the aggregation path.');
                      }
                      return choices;
                  }
                  return [];
              }
            : [],
        guiOptions: {
            ...guiOptions,
            selectType: 'dynamic',
            placeholder: guiOptions?.placeholder ?? (t('aggregationPath.defaultPlaceholder') as string)
        }
    };
}

/**
 * Method converts choices to "PromptListChoices" type.
 *
 * @param obj - object to be converted to choices
 * @param sort - apply alphabetical sort(default is "true")
 * @param defaultKey - default key to be checked in choices
 * @returns the list of choices.
 */
export function transformChoices(
    obj: Record<string, string> | string[],
    sort = true,
    defaultKey?: string
): PromptListChoices {
    let choices: PromptListChoices = [];
    if (!Array.isArray(obj)) {
        choices = Object.entries(obj).map(([key, value]) => {
            // Add checked if value matches defaultKey example: `/mvc:View/macro:Page/`
            if (key === defaultKey) {
                return { name: key, value, checked: true };
            }
            return { name: key, value };
        });
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
    const { fs, project, appPath } = context;
    const { guiOptions } = properties;
    const prompt: InputPromptQuestion = {
        ...properties,
        type: 'input',
        name: 'buildingBlockData.filterBar',
        guiOptions: {
            ...guiOptions,
            placeholder: guiOptions?.placeholder ?? (t('filterBar.defaultPlaceholder') as string)
        }
    };
    if (properties.type === 'input') {
        return prompt;
    }
    return {
        ...prompt,
        type: 'list',
        choices: project
            ? async (answers: Answers) => {
                  if (!answers.viewOrFragmentPath) {
                      return [];
                  }
                  return transformChoices(await getFilterBarIdsInFile(join(appPath, answers.viewOrFragmentPath), fs));
              }
            : [],
        guiOptions: {
            ...prompt.guiOptions,
            selectType: 'dynamic'
        }
    };
}

/**
 * Returns the Binding Context Type Prompt.
 *
 * @param properties - object with additional properties of question
 * @returns prompt for choosing binding context type.
 */
export function getBindingContextTypePrompt(properties: Partial<ListPromptQuestion> = {}): ListPromptQuestion {
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'list',
        name: 'buildingBlockData.metaPath.bindingContextType',
        choices: properties.choices ?? [
            { name: t('bindingContextType.option.absolute') as string, value: 'absolute' },
            { name: t('bindingContextType.option.relative') as string, value: 'relative' }
        ],
        guiOptions: {
            ...guiOptions,
            selectType: typeof properties.choices === 'function' ? 'dynamic' : 'static'
        }
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
    const { fs, project, appPath } = context;
    const { guiOptions } = properties;
    return {
        ...properties,
        type: 'input',
        name: 'buildingBlockData.id',
        validate: (value: string, answers?: Answers) => {
            if (!project) {
                return true;
            }
            if (!value) {
                return validationErrorMessage;
            } else {
                return answers?.viewOrFragmentPath &&
                    !isElementIdAvailable(fs, join(appPath, answers.viewOrFragmentPath), value)
                    ? (t('id.existingIdValidation') as string)
                    : true;
            }
        },
        guiOptions: {
            ...guiOptions,
            placeholder: guiOptions?.placeholder ?? (t('id.defaultPlaceholder') as string)
        }
    };
}
