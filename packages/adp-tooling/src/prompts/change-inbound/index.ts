import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../i18n';
import type { InboundChangeAnswers } from '../../types';

/**
 * Gets the prompts for Inbound Change.
 *
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
            store: false,
            validate: (value: string, answers: InboundChangeAnswers) =>
                answers.subtitle !== '' || answers.icon !== '' || value !== ''
                    ? true
                    : t('validators.missingIconOrTitleOrSubtitle')
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'subtitle',
            message: t('prompts.subtitle'),
            guiOptions: {
                hint: t('tooltips.subtitle')
            },
            store: false,
            validate: (value: string, answers: InboundChangeAnswers) =>
                value !== '' || answers.icon !== '' || answers.title !== ''
                    ? true
                    : t('validators.missingIconOrTitleOrSubtitle')
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
                answers.subtitle !== '' || value !== '' || answers.title !== ''
                    ? true
                    : t('validators.missingIconOrTitleOrSubtitle')
        } as InputQuestion<InboundChangeAnswers>
    ];
}
