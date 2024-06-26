import type { InputQuestion, YUIQuestion } from '@sap-ux/inquirer-common';
import { t } from '../../i18n';
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
                hint: t('prompts.inboundIdTooltip')
            },
            validate: isNotEmptyString,
            when: !inboundId
        } as InputQuestion<InboundChangeAnswers>,
        {
            type: 'input',
            name: 'inboundIdLabel',
            message: t('prompts.inboundIdLabel', inboundId),
            guiOptions: {
                type: "label",
                hint: t('prompts.inboundIdTooltip')
            },
            store: false
            when: inboundId

        } as InputQuestion<InboundChangeAnswers>
    ];
}
