import type { Answers } from 'inquirer';
import { SapShortTextType } from '@sap-ux/i18n';
import { UIAnnotationTerms } from '@sap-ux/vocabularies-types/vocabularies/UI';

import type { PromptContext, Prompts, PromptsGroup } from '../../../prompts/types';
import type { BuildingBlockConfig, Form } from '../../types';

import { i18nNamespaces, translate } from '../../../i18n';
import { getManifestPromptsGroup } from './building-blocks';
import {
    getBuildingBlockIdPrompt,
    getBindingContextTypePrompt,
    getEntityPrompt,
    getAggregationPathPrompt,
    getAnnotationPathQualifierPrompt,
    getViewOrFragmentPathPrompt,
    getCAPServicePrompt,
    isCapProject
} from '../utils';
import { BuildingBlockType } from '../../types';

const MANIFEST_LIBRARIES_GROUP = getManifestPromptsGroup();

export type FormPromptsAnswer = BuildingBlockConfig<Form> & Answers;

const groupIds = {
    commonFormBuildingBlockProperties: 'formBuildingBlockProperties'
};

const defaultAnswers = {
    id: 'Form',
    bindingContextType: 'absolute'
};

/**
 * Returns a list of prompts required to generate a form building block.
 *
 * @param context - prompt context including data about project
 * @returns Prompt with questions for form.
 */
export async function getFormBuildingBlockPrompts(context: PromptContext): Promise<Prompts<FormPromptsAnswer>> {
    const { project } = context;
    const t = translate(i18nNamespaces.buildingBlock, 'prompts.form.');
    const groups: PromptsGroup[] = [
        {
            id: groupIds.commonFormBuildingBlockProperties,
            title: t('formBuildingBlockPropertiesTitle') as string,
            description: t('formBuildingBlockPropertiesDescription', { returnObjects: true }) as string[]
        },
        MANIFEST_LIBRARIES_GROUP
    ];

    const questionsArray = [
        getViewOrFragmentPathPrompt(context, t('viewOrFragmentPath.validate') as string, {
            message: t('viewOrFragmentPath.message') as string,
            guiOptions: {
                groupId: groupIds.commonFormBuildingBlockProperties,
                mandatory: true,
                dependantPromptNames: ['aggregationPath']
            }
        }),
        getBuildingBlockIdPrompt(context, t('id.validation') as string, {
            message: t('id.message') as string,
            default: defaultAnswers.id,
            guiOptions: {
                groupId: groupIds.commonFormBuildingBlockProperties,
                mandatory: true
            }
        }),

        getBindingContextTypePrompt({
            message: t('bindingContextType') as string,
            default: defaultAnswers.bindingContextType,
            guiOptions: {
                groupId: groupIds.commonFormBuildingBlockProperties,
                mandatory: true,
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
            }
        }),

        ...(project && isCapProject(project)
            ? [
                  await getCAPServicePrompt(context, {
                      message: t('service') as string,
                      guiOptions: {
                          groupId: groupIds.commonFormBuildingBlockProperties,
                          mandatory: true,
                          dependantPromptNames: []
                      }
                  })
              ]
            : []),
        getEntityPrompt(context, {
            message: t('entity') as string,
            guiOptions: {
                groupId: groupIds.commonFormBuildingBlockProperties,
                mandatory: true,
                dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
            }
        }),

        getAnnotationPathQualifierPrompt(
            context,
            {
                message: t('qualifier') as string,
                guiOptions: {
                    hint: t('valuesDependentOnEntityTypeInfo') as string,
                    groupId: groupIds.commonFormBuildingBlockProperties,
                    mandatory: true,
                    placeholder: t('qualifierPlaceholder') as string
                }
            },
            [UIAnnotationTerms.FieldGroup]
        ),

        getAggregationPathPrompt(context, {
            message: t('aggregation') as string,
            guiOptions: {
                groupId: groupIds.commonFormBuildingBlockProperties,
                mandatory: true
            }
        }),

        {
            type: 'input',
            name: 'buildingBlockData.title',
            message: t('title.message') as string,
            guiOptions: {
                groupId: groupIds.commonFormBuildingBlockProperties,
                mandatory: true,
                translationProperties: {
                    type: SapShortTextType.Heading,
                    annotation: t('title.translationAnnotation') as string
                }
            }
        }
    ];

    return {
        groups,
        questions: questionsArray,
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Form
            }
        }
    } as Prompts<FormPromptsAnswer>;
}
