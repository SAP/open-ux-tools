import type { Annotations } from '@sap-ux/axios-extension';
import type { ListQuestion } from '@sap-ux/inquirer-common';
import { OdataVersion } from '@sap-ux/odata-service-writer';
import { readFile } from 'fs/promises';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import { getAnalyticListPageQuestions } from '../../../../src/prompts/edmx/alp-questions';
import type { EntityAnswer } from '../../../../src/prompts/edmx/entity-helper';
import { EntityPromptNames } from '../../../../src/types';
import { join } from 'path';

describe('Test analytic list page specific prompts', () => {
    let annotationsWithPresentationQualifier: string;

    beforeAll(async () => {
        annotationsWithPresentationQualifier = await readFile(
            join(__dirname, '../test-data/annotationsWithPresentationQualifier.xml'),
            'utf8'
        );
        // Ensure i18n texts are loaded so we can test localised strings
        await initI18nOdataServiceInquirer();
    });
    test('should return the correct questions for the analytic list page: odata version v2', async () => {
        const questions = getAnalyticListPageQuestions(OdataVersion.v2);
        expect(questions).toEqual([
            {
                default: false,
                guiOptions: {
                    breadcrumb: true,
                    hint: t('prompts.tableMultiSelect.hint')
                },
                message: t('prompts.tableMultiSelect.message'),
                name: 'tableMultiSelect',
                type: 'confirm'
            },
            {
                default: true,
                guiOptions: {
                    breadcrumb: true,
                    hint: t('prompts.tableAutoHide.hint')
                },
                message: t('prompts.tableAutoHide.message'),
                name: 'tableAutoHide',
                type: 'confirm'
            },
            {
                default: false,
                guiOptions: {
                    breadcrumb: true,
                    hint: t('prompts.smartVariantManagement.hint')
                },
                message: t('prompts.smartVariantManagement.message'),
                name: 'smartVariantManagement',
                type: 'confirm'
            }
        ]);
    });

    test('should return the correct questions for the analytic list page: odata version v4', async () => {
        let questions = getAnalyticListPageQuestions(OdataVersion.v4);
        expect(questions).toEqual([
            {
                choices: expect.any(Function),
                guiOptions: {
                    breadcrumb: true,
                    hint: t('prompts.tableSelectionMode.hint')
                },
                message: t('prompts.tableSelectionMode.message'),
                name: 'tableSelectionMode',
                type: 'list',
                when: expect.any(Function)
            }
        ]);
        const tableSelectionModePrompt = questions.find(
            (question) => question.name === EntityPromptNames.tableSelectionMode
        ) as ListQuestion;
        expect(
            (tableSelectionModePrompt.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'anyEntitySetName',
                    entitySetType: 'anyEntitySetType'
                } as EntityAnswer
            })
        ).toBe(true);
        expect((tableSelectionModePrompt.choices as Function)()).toEqual([
            {
                name: 'None',
                value: 'None'
            },
            {
                name: 'Auto',
                value: 'Auto'
            },
            {
                name: 'Multi',
                value: 'Multi'
            },
            {
                name: 'Single',
                value: 'Single'
            }
        ]);

        questions = getAnalyticListPageQuestions(OdataVersion.v4, undefined, true);
        expect(questions).toEqual([]);
    });

    test('should return the correct questions for the analytic list page with select presentation qualifier', async () => {
        const annotations: Annotations = {
            Definitions: annotationsWithPresentationQualifier,
            TechnicalName: 'SEPMRA_ALP_SO_ANA_SRV',
            Uri: '../../../sap/sepmra_alp_so_ana_srv/$metadata',
            Version: '0001'
        };

        const questions = getAnalyticListPageQuestions(OdataVersion.v2, annotations);
        const presentationQualifierPrompt = questions.find(
            (question) => question.name === EntityPromptNames.presentationQualifier
        ) as ListQuestion;
        expect(
            (presentationQualifierPrompt.when as Function)({
                [EntityPromptNames.mainEntity]: {
                    entitySetName: 'SEPMRA_C_ALP_SlsOrdItemCubeALPResults',
                    entitySetType: 'SEPMRA_ALP_SO_ANA_SRV.SEPMRA_C_ALP_SlsOrdItemCubeALPResult'
                } as EntityAnswer
            })
        ).toBe(true);
        expect((presentationQualifierPrompt.choices as Function)()).toEqual([
            {
                name: 'None',
                value: undefined
            },
            {
                name: 'DefaultVariant',
                value: 'DefaultVariant'
            }
        ]);
    });
});
