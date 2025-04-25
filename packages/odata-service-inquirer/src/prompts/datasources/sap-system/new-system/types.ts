import { type SapSystemType, promptNames } from '../../../../types';

export const newSystemPromptNames = {
    newSystemType: 'newSystemType',
    newSystemUrl: 'newSystemUrl',
    newSystemAuthType: 'newSystemAuthType'
} as const;

/**
 * Internal only answers to service URL prompting not returned with OdataServiceAnswers.
 */
export interface NewSystemAnswers {
    [newSystemPromptNames.newSystemType]?: SapSystemType;
    [promptNames.userSystemName]?: string;
}
