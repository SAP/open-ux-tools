import type { Answers } from 'inquirer';
import { i18nNamespaces, translate } from '../../../i18n';
import {
    getBuildingBlockIdPrompt,
    getViewOrFragmentPathPrompt,
    getBindingContextTypePrompt,
    getAggregationPathPrompt,
    getEntityPrompt,
    getCAPServicePrompt,
    isCapProject
} from '../utils';
import type { PromptContext, Prompts } from '../../../prompts/types';
import { BuildingBlockType } from '../../types';
import type { BuildingBlockConfig, Form } from '../../types';
import { SapShortTextType } from '@sap-ux/i18n';

export type FormPromptsAnswer = BuildingBlockConfig<Form> & Answers;

const defaultAnswers = {
    id: 'Form',
    bindingContextType: 'absolute'
};

const groupIds = {
    commonFormBuildingBlockProperties: 'formBuildingBlockProperties',
    filterConfigureEvents: 'filterConfigureEvents'
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

    return {
        questions: [
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
                guiOptions: { groupId: groupIds.commonFormBuildingBlockProperties, mandatory: true }
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
            getAggregationPathPrompt(context, {
                message: t('aggregation') as string,
                guiOptions: { groupId: groupIds.commonFormBuildingBlockProperties, mandatory: true }
            }),
            getEntityPrompt(context, {
                message: t('entity') as string,
                guiOptions: {
                    groupId: groupIds.commonFormBuildingBlockProperties,
                    mandatory: true,
                    dependantPromptNames: ['buildingBlockData.metaPath.qualifier']
                }
            }),
            {
                type: 'input',
                name: 'buildingBlockData.title',
                message: t('title.message') as string,
                guiOptions: {
                    mandatory: true,
                    translationProperties: {
                        type: SapShortTextType.Heading,
                        annotation: t('title.translationAnnotation') as string
                    }
                }
            }
        ],
        initialAnswers: {
            buildingBlockData: {
                buildingBlockType: BuildingBlockType.Form
            }
        }
    };
}
