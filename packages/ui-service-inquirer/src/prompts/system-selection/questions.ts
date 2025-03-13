import type { AbapServiceProvider } from '@sap-ux/axios-extension';
import type { Logger } from '@sap-ux/logger';
import { getSystemSelectionQuestions, promptNames } from '@sap-ux/odata-service-inquirer';
import type { ListQuestion } from 'inquirer';
import type { Question } from 'yeoman-generator';
import { t } from '../../i18n';
import { ObjectType, type UiServiceAnswers } from '../../types';
import { getAbapCDSViews, getBusinessObjects } from '../prompt-helper';
import { PromptState } from '../prompt-state';

/**
 * Get the system questions.
 *
 * @param logger - logger instance to use for logging
 * @param previousAnswers - answers used to prepopulate the prompts
 * @param systemName - the name of the system
 * @returns the system questions
 */
export async function getSystemQuestions(
    logger: Logger,
    previousAnswers?: UiServiceAnswers,
    systemName?: string
): Promise<Question<UiServiceAnswers>[]> {
    PromptState.reset();
    const systemQuestions = await getSystemSelectionQuestions(
        {
            serviceSelection: { hide: true },
            systemSelection: { defaultChoice: systemName }
        },
        true
    );
    const objectQuestions = [
        {
            when: (answers: any) => {
                if (answers[promptNames.systemSelection] && systemQuestions.answers.connectedSystem?.serviceProvider) {
                    PromptState.systemSelection.connectedSystem = systemQuestions.answers.connectedSystem;
                    return true;
                }
            },
            type: 'list',
            name: 'objectType',
            guiOptions: {
                breadcrumb: true
            },
            default: previousAnswers?.objectType ?? '',
            message: t('MESSAGE_OBJECT_TYPE'),
            choices: () => [
                { name: t('MESSAGE_BUSINESS_OBJECT_INTERFACE'), value: ObjectType.BUSINESS_OBJECT },
                { name: t('MESSAGE_ABAP_CDS_SERVICE'), value: ObjectType.CDS_VIEW }
            ]
        },
        {
            when: (previousAnswers: any) => previousAnswers.objectType === ObjectType.BUSINESS_OBJECT,
            type: 'list',
            name: 'businessObjectInterface',
            guiOptions: {
                breadcrumb: true,
                applyDefaultWhenDirty: true
            },
            default: previousAnswers?.businessObjectInterface ?? '',
            message: t('MESSAGE_BUSINESS_OBJECT_INTERFACE'),
            choices: async () => {
                try {
                    return await getBusinessObjects(
                        PromptState.systemSelection.connectedSystem?.serviceProvider as AbapServiceProvider
                    );
                } catch (error) {
                    logger.error(t('ERROR_FETCHING_BUSINESS_OBJECTS' + error.message));
                }
            },
            validate: async (val: any) => {
                if (val) {
                    try {
                        PromptState.systemSelection.objectGenerator = await (
                            PromptState.systemSelection.connectedSystem?.serviceProvider as AbapServiceProvider
                        ).getUiServiceGenerator(val);
                    } catch (error) {
                        logger.error(t('ERROR_FETCHING_GENERATOR', { error: error.message }));
                    }
                    return PromptState.systemSelection.objectGenerator ? true : t('NO_GENERATOR_FOUND_BO');
                }
            }
        } as ListQuestion,
        {
            when: (previousAnswers: any) => previousAnswers.objectType === ObjectType.CDS_VIEW,
            type: 'list',
            name: 'abapCDSView',
            guiOptions: {
                breadcrumb: true,
                applyDefaultWhenDirty: true
            },
            default: previousAnswers?.abapCDSView ?? '',
            message: t('MESSAGE_ABAP_CDS_SERVICE'),
            choices: async () => {
                try {
                    return await getAbapCDSViews(
                        PromptState.systemSelection.connectedSystem?.serviceProvider as AbapServiceProvider
                    );
                } catch (error) {
                    logger.error(t('ERROR_FETCHING_CDS_VIEWS', { error: error.message }));
                }
            },
            validate: async (val: any) => {
                if (val) {
                    try {
                        PromptState.systemSelection.objectGenerator = await (
                            PromptState.systemSelection.connectedSystem?.serviceProvider as AbapServiceProvider
                        ).getUiServiceGenerator(val);
                    } catch (error) {
                        logger.error(t('ERROR_FETCHING_GENERATOR', { error: error.message }));
                    }
                    return PromptState.systemSelection.objectGenerator ? true : t('NO_GENERATOR_FOUND_CDS_SERVICE');
                }
            }
        } as ListQuestion
    ];
    return [
        ...(systemQuestions.prompts as Question<UiServiceAnswers>[]),
        ...(objectQuestions as Question<UiServiceAnswers>[])
    ];
}
