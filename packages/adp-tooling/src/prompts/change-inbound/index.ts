import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../base/i18n';
import type { InboundChangeAnswers } from '../../types';

/**
 * Gets the prompts for Inbound Change.
 *
 * @param {string} inboundId - Inbound Id of the Adp Project.
 * @returns {YUIQuestion<InboundChangeAnswers>[]} The questions/prompts.
 */
export function getPrompts(): YUIQuestion<InboundChangeAnswers>[] {
    return [
        {
            type: 'input',
            name: 'title',
            message: t('prompts.title'),
            guiOptions: {
                hint: t('tooltips.title')
            },
            validate: (value: string, answers: InboundChangeAnswers) =>
                answers.subTitle || answers.icon !== '' || value ? true : t('missingIconOrTitleOrSubtitle'),
            store: false
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'subtitle',
            message: t('prompts.subtitle'),
            guiOptions: {
                hint: t('tooltips.subtitle')
            },
            validate: (value: string, answers: InboundChangeAnswers) =>
                value || answers.icon !== '' || answers.title !== '' ? true : t('missingIconOrTitleOrSubtitle'),
            store: false
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'icon',
            message: t('prompts.icon'),
            guiOptions: {
                hint: t('tooltips.icon')
            },
            store: false,
            validate: (value: string, answers: InboundChangeAnswers) =>
                answers.subTitle || value || answers.title !== '' ? true : t('missingIconOrTitleOrSubtitle')
        } as InputQuestion<InboundChangeAnswers>
    ];
}
