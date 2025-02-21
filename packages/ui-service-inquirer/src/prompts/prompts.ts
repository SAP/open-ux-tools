import type { ConfirmQuestion, ListQuestion } from 'inquirer';
import type { ServiceProvider, AbapServiceProvider } from '@sap-ux/axios-extension';
import { Severity } from '@sap-devx/yeoman-ui-types';
import { getSystemSelectionQuestions, promptNames } from '@sap-ux/odata-service-inquirer';
import { getPackagePrompts, getTransportRequestPrompts } from '@sap-ux/abap-deploy-config-inquirer';
import type { Question } from 'yeoman-generator';
import { getAbapCDSViews, getBusinessObjects, ObjectType, PromptState, type UiServiceAnswers } from '..';
import { t } from '../i18n';

//const interface UiServiceState = {}

export async function getSystemQuestions(state: any): Promise<Question<UiServiceAnswers>[]> {
    const systemQuestions = await getSystemSelectionQuestions({ serviceSelection: { hide: true } }, true);
    const addtionalQuestions = [
        {
            when: (answers: any) => {
                if (answers[promptNames.systemSelection] && systemQuestions.answers.connectedSystem?.serviceProvider) {
                    if (systemQuestions.answers.connectedSystem?.backendSystem) {
                        state.backend = systemQuestions.answers.connectedSystem?.backendSystem;
                    }
                    if (systemQuestions.answers.connectedSystem?.destination) {
                        state.destination = systemQuestions.answers.connectedSystem?.destination;
                    }
                    PromptState.provider = systemQuestions.answers.connectedSystem
                        ?.serviceProvider as unknown as AbapServiceProvider;
                    return true;
                }
            },
            type: 'list',
            name: 'objectType',
            guiOptions: {
                breadcrumb: true
            },
            default: state.objectType || '',
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
            default: state.businessObjectInterface || '',
            message: t('MESSAGE_BUSINESS_OBJECT_INTERFACE'),
            choices: async () => {
                try {
                    return await getBusinessObjects(PromptState.provider!);
                } catch (error) {
                    //UiServiceGenLogger.logger.error(t('ERROR_FETCHING_BUSINESS_OBJECTS' + error.message));
                }
            },
            validate: async (val: any) => {
                if (val) {
                    try {
                        PromptState.uiCreateService = await PromptState.provider!.getUiServiceGenerator(val);
                    } catch (error) {
                        //UiServiceGenLogger.logger.error(t('ERROR_FETCHING_GENERATOR', { error: error.message }));
                    }
                    return PromptState.uiCreateService ? true : t('NO_GENERATOR_FOUND_BO');
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
            default: state.abapCDSView || '',
            message: t('MESSAGE_ABAP_CDS_SERVICE'),
            choices: async () => {
                try {
                    return await getAbapCDSViews(PromptState.provider!);
                } catch (error) {
                    //UiServiceGenLogger.logger.error(t('ERROR_FETCHING_CDS_VIEWS', { error: error.message }));
                }
            },
            validate: async (val: any) => {
                if (val) {
                    try {
                        PromptState.uiCreateService = await PromptState.provider!.getUiServiceGenerator(val);
                    } catch (error) {
                        //UiServiceGenLogger.logger.error(t('ERROR_FETCHING_GENERATOR', { error: error.message }));
                    }
                    return PromptState.uiCreateService ? true : t('NO_GENERATOR_FOUND_CDS_SERVICE');
                }
            }
        } as ListQuestion
    ];
    return [...systemQuestions.prompts, ...addtionalQuestions];
}
