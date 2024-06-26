import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../base/i18n';
import type { InboundChangeAnswers } from '../../types';
import { isNotEmptyString } from '../../base/helper';

export function getPrompts(inboundId: string): YUIQuestion<InboundChangeAnswers>[] {
    return [
        {
            type: 'input',
            name: 'inboundId',
            message: t('prompts.inboundId'),
            store: false,
            guiOptions: {
                mandatory: true,
                hint: t('tooltips.inboundId')
            },
            validate: isNotEmptyString,
            when: !inboundId
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'title',
            message: t('prompts.title'),
            guiOptions: {
                hint: t('tooltips.title')
            },
            store: false
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'subtitle',
            message: t('prompts.subtitle'),
            guiOptions: {
                hint: t('tooltips.subtitle')
            },
            store: false
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'icon',
            message: t('prompts.icon'),
            guiOptions: {
                hint: t('tooltips.icon')
            },
            store: false
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'validationMessage',
            message: ' ',
            store: false,
            validate: (answers: InboundChangeAnswers) =>
                !answers.title && !answers.subTitle && !answers.icon ? 'Test' : true,
            when: (answers: InboundChangeAnswers) => !answers.title && !answers.subTitle && !answers.icon
        } as InputQuestion<InboundChangeAnswers>
    ];
}
